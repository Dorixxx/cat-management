from sqlalchemy.orm import Session
from sqlalchemy import func, extract, or_, and_
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from . import models, schemas


# ============== Cat CRUD ==============
def get_cat(db: Session, cat_id: int):
    return db.query(models.Cat).filter(models.Cat.id == cat_id).first()


def get_cats(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Cat).offset(skip).limit(limit).all()


def create_cat(db: Session, cat: schemas.CatCreate):
    db_cat = models.Cat(**cat.model_dump())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


def update_cat(db: Session, cat_id: int, cat: schemas.CatUpdate):
    db_cat = get_cat(db, cat_id)
    if not db_cat:
        return None
    update_data = cat.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cat, key, value)
    db.commit()
    db.refresh(db_cat)
    return db_cat


def delete_cat(db: Session, cat_id: int):
    db_cat = get_cat(db, cat_id)
    if not db_cat:
        return None
    db.delete(db_cat)
    db.commit()
    return db_cat


# ============== Weight Record CRUD ==============
def get_weight_records(db: Session, cat_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.WeightRecord).filter(
        models.WeightRecord.cat_id == cat_id
    ).order_by(models.WeightRecord.record_date.desc()).offset(skip).limit(limit).all()


def create_weight_record(db: Session, cat_id: int, record: schemas.WeightRecordCreate):
    db_record = models.WeightRecord(cat_id=cat_id, **record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    # Update cat's current weight
    cat = get_cat(db, cat_id)
    if cat:
        cat.weight = record.weight
        db.commit()
    return db_record


def delete_weight_record(db: Session, record_id: int):
    db_record = db.query(models.WeightRecord).filter(models.WeightRecord.id == record_id).first()
    if not db_record:
        return None
    db.delete(db_record)
    db.commit()
    return db_record


# ============== Task CRUD ==============
def get_task(db: Session, task_id: int):
    return db.query(models.Task).filter(models.Task.id == task_id).first()


def get_tasks(db: Session, cat_id: Optional[int] = None, active_only: bool = False, skip: int = 0, limit: int = 100):
    query = db.query(models.Task)
    if cat_id is not None:
        # Include tasks selected for this cat and tasks that apply to all cats.
        query = query.filter(or_(
            models.Task.cat_id == cat_id,
            models.Task.cats.any(models.Cat.id == cat_id),
            and_(models.Task.cat_id.is_(None), ~models.Task.cats.any()),
        ))
    if active_only:
        query = query.filter(models.Task.is_active == True)
    return query.order_by(models.Task.next_due_date).offset(skip).limit(limit).all()


def get_due_tasks(db: Session, minutes: int = 30):
    """获取即将到期的任务"""
    now = datetime.now()
    deadline = now + timedelta(minutes=minutes)
    return db.query(models.Task).filter(
        models.Task.is_active == True,
        models.Task.next_due_date <= deadline,
        models.Task.next_due_date >= now
    ).all()


def create_task(db: Session, task: schemas.TaskCreate):
    task_data = task.model_dump(exclude={"cat_ids"})
    cat_ids = _validate_cat_ids(db, task.cat_ids)
    # A new cat_ids request is the source of truth.  Do not set the legacy
    # foreign key as well: deleting the first selected cat must not delete a
    # task that still targets other cats.
    if cat_ids:
        task_data["cat_id"] = None
    db_task = models.Task(**task_data)
    if cat_ids:
        db_task.cats = _get_cats_by_ids(db, cat_ids)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, task_id: int, task: schemas.TaskUpdate):
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    update_data = task.model_dump(exclude_unset=True, exclude={"cat_ids"})
    if "cat_ids" in task.model_fields_set:
        cat_ids = _validate_cat_ids(db, task.cat_ids or [])
        db_task.cats = _get_cats_by_ids(db, cat_ids)
        update_data["cat_id"] = None
    for key, value in update_data.items():
        setattr(db_task, key, value)
    db.commit()
    db.refresh(db_task)
    return db_task


def _get_cats_by_ids(db: Session, cat_ids: List[int]):
    if not cat_ids:
        return []
    cats = db.query(models.Cat).filter(models.Cat.id.in_(cat_ids)).all()
    by_id = {cat.id: cat for cat in cats}
    return [by_id[cat_id] for cat_id in cat_ids]


def _validate_cat_ids(db: Session, cat_ids: List[int]):
    unique_ids = list(dict.fromkeys(cat_ids))
    if len(unique_ids) != len(cat_ids):
        raise ValueError("任务对象中包含重复的猫咪")
    if unique_ids and db.query(models.Cat.id).filter(models.Cat.id.in_(unique_ids)).count() != len(unique_ids):
        raise ValueError("任务对象中包含不存在的猫咪")
    return unique_ids


def _target_cat_ids(db: Session, task: models.Task):
    if task.cats:
        return [cat.id for cat in task.cats]
    if task.cat_id is not None:
        return [task.cat_id]
    # No explicit target means every cat, including cats added later.
    return [cat.id for cat in db.query(models.Cat.id).order_by(models.Cat.id).all()]


def _advance_task(task: models.Task):
    if task.frequency_days > 0:
        task.next_due_date = datetime.now() + timedelta(days=task.frequency_days)
    else:
        task.is_active = False


def complete_task(db: Session, task_id: int, cat_id: Optional[int] = None):
    """Complete one cat, advancing only after every target has completed."""
    db_task = get_task(db, task_id)
    if not db_task:
        return None

    target_cat_ids = _target_cat_ids(db, db_task)
    cycle_due_date = db_task.next_due_date
    if cat_id is not None:
        if cat_id not in target_cat_ids:
            raise ValueError("该猫咪不是此任务的对象")
        cats_to_complete = [cat_id]
    else:
        # Retain the previous endpoint behaviour for clients that submit no body.
        cats_to_complete = target_cat_ids

    for completed_cat_id in cats_to_complete:
        already_completed = db.query(models.TaskCompletion.id).filter(
            models.TaskCompletion.task_id == db_task.id,
            models.TaskCompletion.cat_id == completed_cat_id,
            models.TaskCompletion.cycle_due_date == cycle_due_date,
        ).first()
        if not already_completed:
            db.add(models.TaskCompletion(
                task_id=db_task.id,
                cat_id=completed_cat_id,
                cycle_due_date=cycle_due_date,
            ))

    db.flush()
    if not target_cat_ids:
        # An all-cats task with no cats currently registered can still be
        # completed as a whole.
        _advance_task(db_task)
    else:
        completed_ids = {
            record.cat_id for record in db.query(models.TaskCompletion).filter(
                models.TaskCompletion.task_id == db_task.id,
                models.TaskCompletion.cycle_due_date == cycle_due_date,
            ).all()
        }
        if set(target_cat_ids).issubset(completed_ids):
            _advance_task(db_task)
    
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int):
    db_task = get_task(db, task_id)
    if not db_task:
        return None
    db.delete(db_task)
    db.commit()
    return db_task


# ============== Inventory Category CRUD ==============
def get_inventory_category(db: Session, category_id: int):
    return db.query(models.InventoryCategory).filter(models.InventoryCategory.id == category_id).first()


def get_inventory_categories(db: Session):
    return db.query(models.InventoryCategory).order_by(models.InventoryCategory.sort_order).all()


def create_inventory_category(db: Session, category: schemas.InventoryCategoryCreate):
    db_category = models.InventoryCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_inventory_category(db: Session, category_id: int, category: schemas.InventoryCategoryUpdate):
    db_category = get_inventory_category(db, category_id)
    if not db_category:
        return None
    update_data = category.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_category, key, value)
    db.commit()
    db.refresh(db_category)
    return db_category


def delete_inventory_category(db: Session, category_id: int):
    db_category = get_inventory_category(db, category_id)
    if not db_category:
        return None
    db.delete(db_category)
    db.commit()
    return db_category


# ============== Inventory CRUD ==============
def get_inventory_item(db: Session, item_id: int):
    return db.query(models.Inventory).filter(models.Inventory.id == item_id).first()


def get_inventory_items(db: Session, category_id: Optional[int] = None, active_only: bool = True):
    query = db.query(models.Inventory)
    if category_id is not None:
        query = query.filter(models.Inventory.category_id == category_id)
    if active_only:
        query = query.filter(models.Inventory.is_active == True)
    return query.order_by(models.Inventory.name).all()


def create_inventory_item(db: Session, item: schemas.InventoryCreate):
    db_item = models.Inventory(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_inventory_item(db: Session, item_id: int, item: schemas.InventoryUpdate):
    db_item = get_inventory_item(db, item_id)
    if not db_item:
        return None
    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_inventory_item(db: Session, item_id: int):
    db_item = get_inventory_item(db, item_id)
    if not db_item:
        return None
    db.delete(db_item)
    db.commit()
    return db_item


def get_inventory_warnings(db: Session):
    """获取库存预警列表"""
    items = get_inventory_items(db, active_only=True)
    warnings = []
    for item in items:
        if item.weekly_consumption and item.weekly_consumption > 0:
            weeks_remaining = item.current_quantity / item.weekly_consumption
            needs_purchase = weeks_remaining <= item.warning_weeks
        else:
            weeks_remaining = None
            needs_purchase = item.current_quantity <= item.warning_threshold
        
        if needs_purchase:
            warnings.append({
                "item_id": item.id,
                "item_name": item.name,
                "current_quantity": item.current_quantity,
                "weekly_consumption": item.weekly_consumption or Decimal("0"),
                "weeks_remaining": weeks_remaining,
                "warning_weeks": item.warning_weeks,
                "needs_purchase": True
            })
    return warnings


# ============== Consumption Record CRUD ==============
def get_consumption_records(db: Session, item_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.ConsumptionRecord).filter(
        models.ConsumptionRecord.item_id == item_id
    ).order_by(models.ConsumptionRecord.record_date.desc()).offset(skip).limit(limit).all()


def create_consumption_record(db: Session, item_id: int, record: schemas.ConsumptionRecordCreate):
    db_record = models.ConsumptionRecord(item_id=item_id, **record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    # Update inventory quantity
    item = get_inventory_item(db, item_id)
    if item:
        item.current_quantity = item.current_quantity - record.quantity
        if item.current_quantity < 0:
            item.current_quantity = Decimal("0")
        db.commit()
    return db_record


def delete_consumption_record(db: Session, record_id: int):
    db_record = db.query(models.ConsumptionRecord).filter(models.ConsumptionRecord.id == record_id).first()
    if not db_record:
        return None
    # Restore inventory quantity
    item = get_inventory_item(db, db_record.item_id)
    if item:
        item.current_quantity = item.current_quantity + db_record.quantity
        db.commit()
    db.delete(db_record)
    db.commit()
    return db_record


# ============== Expense CRUD ==============
def get_expense(db: Session, expense_id: int):
    return db.query(models.Expense).filter(models.Expense.id == expense_id).first()


def get_expenses(db: Session, cat_id: Optional[int] = None, 
                 start_date: Optional[date] = None, end_date: Optional[date] = None,
                 skip: int = 0, limit: int = 100):
    query = db.query(models.Expense)
    if cat_id is not None:
        query = query.filter(models.Expense.cat_id == cat_id)
    if start_date:
        query = query.filter(models.Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(models.Expense.expense_date <= end_date)
    return query.order_by(models.Expense.expense_date.desc()).offset(skip).limit(limit).all()


def create_expense(db: Session, expense: schemas.ExpenseCreate):
    db_expense = models.Expense(**expense.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


def update_expense(db: Session, expense_id: int, expense: schemas.ExpenseUpdate):
    db_expense = get_expense(db, expense_id)
    if not db_expense:
        return None
    update_data = expense.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_expense, key, value)
    db.commit()
    db.refresh(db_expense)
    return db_expense


def delete_expense(db: Session, expense_id: int):
    db_expense = get_expense(db, expense_id)
    if not db_expense:
        return None
    db.delete(db_expense)
    db.commit()
    return db_expense


def get_expense_statistics(db: Session, start_date: date, end_date: date):
    """获取花费统计"""
    # 按分类统计
    category_stats = db.query(
        models.Expense.category,
        func.sum(models.Expense.amount).label("total"),
        func.count(models.Expense.id).label("count")
    ).filter(
        models.Expense.expense_date >= start_date,
        models.Expense.expense_date <= end_date
    ).group_by(models.Expense.category).all()
    
    # 按月统计
    month_stats = db.query(
        extract('year', models.Expense.expense_date).label("year"),
        extract('month', models.Expense.expense_date).label("month"),
        func.sum(models.Expense.amount).label("total")
    ).filter(
        models.Expense.expense_date >= start_date,
        models.Expense.expense_date <= end_date
    ).group_by("year", "month").order_by("year", "month").all()
    
    total = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.expense_date >= start_date,
        models.Expense.expense_date <= end_date
    ).scalar() or Decimal("0")
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_amount": total,
        "by_category": [
            {"category": c.category, "total": c.total, "count": c.count}
            for c in category_stats
        ],
        "by_month": [
            {"year": int(m.year), "month": int(m.month), "total": m.total}
            for m in month_stats
        ]
    }


# ============== Bark Config CRUD ==============
def get_bark_config(db: Session):
    """获取 Bark 配置（只取第一条）"""
    return db.query(models.BarkConfig).first()


def create_bark_config(db: Session, config: schemas.BarkConfigCreate):
    """创建 Bark 配置"""
    # 先删除旧的
    db.query(models.BarkConfig).delete()
    db_config = models.BarkConfig(**config.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


def update_bark_config(db: Session, config: schemas.BarkConfigUpdate):
    """更新 Bark 配置"""
    db_config = get_bark_config(db)
    if not db_config:
        return None
    update_data = config.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_config, key, value)
    db.commit()
    db.refresh(db_config)
    return db_config
