from sqlalchemy.orm import Session
from sqlalchemy import func, extract, or_, and_
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from . import models, schemas
from .time_utils import local_now_naive, to_utc_naive, utc_naive_to_local_naive, utc_now_naive


CRON_DOW_NAMES = {
    "sun": 0,
    "mon": 1,
    "tue": 2,
    "wed": 3,
    "thu": 4,
    "fri": 5,
    "sat": 6,
}


def _coerce_cron_value(raw: str, names: Optional[dict] = None, allow_sunday_7: bool = False) -> int:
    value = raw.strip().lower()
    if names and value in names:
        return names[value]
    parsed = int(value)
    if allow_sunday_7 and parsed == 7:
        return 0
    return parsed


def _parse_cron_field(
    raw: str,
    minimum: int,
    maximum: int,
    names: Optional[dict] = None,
    allow_sunday_7: bool = False,
):
    raw = raw.strip().lower()
    if raw == "*":
        return None

    values = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue

        step = 1
        if "/" in part:
            part, step_raw = part.split("/", 1)
            step = max(1, int(step_raw))

        if part == "*":
            start, end = minimum, maximum
        elif "-" in part:
            start_raw, end_raw = part.split("-", 1)
            start = _coerce_cron_value(start_raw, names, allow_sunday_7)
            end = _coerce_cron_value(end_raw, names, allow_sunday_7)
        else:
            value = _coerce_cron_value(part, names, allow_sunday_7)
            if minimum <= value <= maximum:
                values.add(value)
            continue

        if start > end:
            start, end = end, start
        for value in range(start, end + 1, step):
            if minimum <= value <= maximum:
                values.add(value)

    return values


def _parse_cron_expression(expression: str):
    parts = expression.split()
    if len(parts) != 5:
        return None
    minute, hour, day_of_month, month, day_of_week = parts
    return {
        "minute": _parse_cron_field(minute, 0, 59),
        "hour": _parse_cron_field(hour, 0, 23),
        "day_of_month": _parse_cron_field(day_of_month, 1, 31),
        "month": _parse_cron_field(month, 1, 12),
        "day_of_week": _parse_cron_field(day_of_week, 0, 6, CRON_DOW_NAMES, allow_sunday_7=True),
    }


def _cron_matches(candidate: datetime, parsed_cron: dict) -> bool:
    standard_day_of_week = (candidate.weekday() + 1) % 7
    checks = (
        ("minute", candidate.minute),
        ("hour", candidate.hour),
        ("month", candidate.month),
    )
    for key, value in checks:
        allowed = parsed_cron[key]
        if allowed is not None and value not in allowed:
            return False

    day_of_month = parsed_cron["day_of_month"]
    day_of_week = parsed_cron["day_of_week"]
    matches_month_day = day_of_month is None or candidate.day in day_of_month
    matches_week_day = day_of_week is None or standard_day_of_week in day_of_week

    if day_of_month is None and day_of_week is None:
        return True
    if day_of_month is None:
        return matches_week_day
    if day_of_week is None:
        return matches_month_day
    return matches_month_day or matches_week_day


def get_next_due_from_cron(expression: Optional[str], from_time: datetime) -> Optional[datetime]:
    if not expression:
        return None
    try:
        parsed_cron = _parse_cron_expression(expression)
        if not parsed_cron:
            return None
    except (TypeError, ValueError):
        return None

    candidate = utc_naive_to_local_naive(from_time).replace(second=0, microsecond=0) + timedelta(minutes=1)
    deadline = candidate + timedelta(days=732)
    while candidate <= deadline:
        if _cron_matches(candidate, parsed_cron):
            return to_utc_naive(candidate)
        candidate += timedelta(minutes=1)
    return None


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
        query = query.filter(or_(
            models.Task.cat_id == cat_id,
            models.Task.cats.any(models.Cat.id == cat_id),
            and_(models.Task.cat_id.is_(None), ~models.Task.cats.any()),
        ))
    if active_only:
        query = query.filter(models.Task.is_active == True)
    return query.order_by(models.Task.next_due_date).offset(skip).limit(limit).all()


def get_due_tasks(db: Session, minutes: int = 30):
    """获取已经到期或即将到期的任务"""
    now = utc_now_naive()
    deadline = now + timedelta(minutes=minutes)
    return db.query(models.Task).filter(
        models.Task.is_active == True,
        models.Task.next_due_date <= deadline
    ).all()


def create_task(db: Session, task: schemas.TaskCreate):
    task_data = task.model_dump(exclude={"cat_ids"})
    task_data["next_due_date"] = to_utc_naive(task.next_due_date)
    cat_ids = _validate_cat_ids(db, task.cat_ids)
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
    if "next_due_date" in update_data and task.next_due_date is not None:
        update_data["next_due_date"] = to_utc_naive(task.next_due_date)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    db.commit()
    db.refresh(db_task)
    return db_task


def _get_cats_by_ids(db: Session, cat_ids: List[int]):
    cats = db.query(models.Cat).filter(models.Cat.id.in_(cat_ids)).all() if cat_ids else []
    by_id = {cat.id: cat for cat in cats}
    return [by_id[cat_id] for cat_id in cat_ids]


def _validate_cat_ids(db: Session, cat_ids: List[int]):
    unique_ids = list(dict.fromkeys(cat_ids))
    if len(unique_ids) != len(cat_ids):
        raise ValueError("任务对象中包含重复的猫咪")
    if unique_ids and db.query(models.Cat.id).filter(models.Cat.id.in_(unique_ids)).count() != len(unique_ids):
        raise ValueError("任务对象中包含不存在的猫咪")
    return unique_ids


def get_task_target_cat_ids(db: Session, task: models.Task):
    if task.cats:
        return [cat.id for cat in task.cats]
    if task.cat_id is not None:
        return [task.cat_id]
    return [cat.id for cat in db.query(models.Cat.id).order_by(models.Cat.id).all()]


def complete_task(db: Session, task_id: int, completion: Optional[schemas.TaskCompleteRequest] = None):
    """完成任务并更新下次到期时间"""
    db_task = get_task(db, task_id)
    if not db_task:
        return None

    completed_at = to_utc_naive(completion.completed_at) if completion and completion.completed_at else utc_now_naive()
    target_cat_ids = get_task_target_cat_ids(db, db_task)
    cycle_due_date = db_task.next_due_date
    requested_cat_ids = list(dict.fromkeys(completion.cat_ids)) if completion and completion.cat_ids else []
    if completion and completion.cat_id is not None:
        requested_cat_ids = list(dict.fromkeys([*requested_cat_ids, completion.cat_id]))
    # Older clients do not send cat_id.  A one-cat task still has an
    # unambiguous completion object and must be recorded as that cat.
    if not requested_cat_ids and len(target_cat_ids) == 1:
        requested_cat_ids = [target_cat_ids[0]]
    if any(cat_id not in target_cat_ids for cat_id in requested_cat_ids):
        raise ValueError("该猫咪不是此任务的对象")
    cats_to_complete = requested_cat_ids or target_cat_ids
    already_completed_ids = {entry.cat_id for entry in db.query(models.TaskCatCompletion).filter(
        models.TaskCatCompletion.task_id == task_id,
        models.TaskCatCompletion.cycle_due_date == cycle_due_date,
    ).all()}
    cats_to_complete = [cat_id for cat_id in cats_to_complete if cat_id not in already_completed_ids]
    for cat_id in cats_to_complete:
        if not db.query(models.TaskCatCompletion.id).filter(
            models.TaskCatCompletion.task_id == task_id,
            models.TaskCatCompletion.cat_id == cat_id,
            models.TaskCatCompletion.cycle_due_date == cycle_due_date,
        ).first():
            db.add(models.TaskCatCompletion(task_id=task_id, cat_id=cat_id, cycle_due_date=cycle_due_date, completed_at=completed_at))
    db.flush()
    completed_cat_ids = {entry.cat_id for entry in db.query(models.TaskCatCompletion).filter(
        models.TaskCatCompletion.task_id == task_id,
        models.TaskCatCompletion.cycle_due_date == cycle_due_date,
    ).all()}
    deducted_quantity = db_task.linked_item_quantity or Decimal("0")
    if db_task.linked_item_id and deducted_quantity > 0:
        item = get_inventory_item(db, db_task.linked_item_id)
        if item:
            item.current_quantity = max(Decimal("0"), item.current_quantity - deducted_quantity * len(cats_to_complete))
    for cat_id in cats_to_complete:
        db.add(models.TaskCompletion(
            task_id=task_id,
            cat_id=cat_id,
            completed_at=completed_at,
            notes=completion.notes if completion else None,
            severity=(completion.severity if completion and completion.severity else "normal"),
            linked_item_id=db_task.linked_item_id,
            deducted_quantity=deducted_quantity,
        ))
    if target_cat_ids and not set(target_cat_ids).issubset(completed_cat_ids):
        db.commit()
        db.refresh(db_task)
        return db_task
    db_task.completed_count = (db_task.completed_count or 0) + 1

    schedule_type = db_task.schedule_type or ("interval" if db_task.frequency_days > 0 else "temporary")
    next_cron_due = None
    if schedule_type == "cron":
        next_cron_due = get_next_due_from_cron(db_task.cron_expression, completed_at)

    if next_cron_due:
        db_task.next_due_date = next_cron_due
    elif db_task.frequency_days > 0:
        # 周期性任务，更新下次到期时间
        db_task.next_due_date = completed_at + timedelta(days=db_task.frequency_days)
    else:
        # 一次性任务，标记为不活跃
        db_task.is_active = False

    if db_task.completion_target and db_task.completed_count >= db_task.completion_target:
        db_task.is_active = False

    db_task.reminder_sent_count = 0
    db_task.reminder_cycle_key = None
    
    db.commit()
    db.refresh(db_task)
    return db_task


def get_task_completions(db: Session, task_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.TaskCompletion).filter(
        models.TaskCompletion.task_id == task_id
    ).order_by(models.TaskCompletion.completed_at.desc()).offset(skip).limit(limit).all()


def update_task_completion(db: Session, completion_id: int, update: schemas.TaskCompletionUpdate):
    record = db.query(models.TaskCompletion).filter(models.TaskCompletion.id == completion_id).first()
    if not record:
        return None
    record.notes = update.notes
    db.commit()
    db.refresh(record)
    return record


def delete_task_completion(db: Session, completion_id: int):
    record = db.query(models.TaskCompletion).filter(models.TaskCompletion.id == completion_id).first()
    if not record:
        return None
    db.delete(record)
    db.commit()
    return record


def get_all_task_completions(
    db: Session,
    skip: int = 0,
    limit: int = 500,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    task_id: Optional[int] = None,
    schedule_type: Optional[str] = None,
    severity: Optional[str] = None,
):
    query = db.query(models.TaskCompletion).join(models.Task, models.TaskCompletion.task_id == models.Task.id)

    if start_date is not None:
        query = query.filter(models.TaskCompletion.completed_at >= start_date)
    if end_date is not None:
        query = query.filter(models.TaskCompletion.completed_at <= end_date)
    if task_id is not None:
        query = query.filter(models.TaskCompletion.task_id == task_id)
    if schedule_type:
        query = query.filter(models.Task.schedule_type == schedule_type)
    if severity:
        query = query.filter(models.TaskCompletion.severity == severity)

    return query.order_by(
        models.TaskCompletion.completed_at.desc()
    ).offset(skip).limit(limit).all()


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
    today = date.today()
    config = get_bark_config(db)
    default_expiry_warning_days = config.expiry_warning_days if config else 7

    def convert_quantity(value, source_unit, target_unit):
        if source_unit == target_unit or not source_unit or not target_unit:
            return value
        factors = {"kg": Decimal("1000"), "g": Decimal("1"), "L": Decimal("1000"), "ml": Decimal("1")}
        if source_unit not in factors or target_unit not in factors:
            return value
        is_weight = source_unit in {"kg", "g"}
        if is_weight != (target_unit in {"kg", "g"}):
            return value
        return value * factors[source_unit] / factors[target_unit]

    for item in items:
        daily_consumption = convert_quantity(item.daily_consumption or Decimal("0"), item.consumption_unit, item.unit)
        weekly_consumption = item.weekly_consumption or Decimal("0")
        warning_threshold = convert_quantity(item.warning_threshold or Decimal("0"), item.warning_unit, item.unit)

        if daily_consumption > 0:
            days_remaining = item.current_quantity / daily_consumption
            weeks_remaining = days_remaining / Decimal("7")
            needs_purchase = weeks_remaining <= item.warning_weeks
        elif weekly_consumption > 0:
            weeks_remaining = item.current_quantity / weekly_consumption
            days_remaining = weeks_remaining * Decimal("7")
            needs_purchase = weeks_remaining <= item.warning_weeks
        else:
            days_remaining = None
            weeks_remaining = None
            needs_purchase = item.current_quantity <= warning_threshold
        
        if needs_purchase:
            warnings.append({
                "item_id": item.id,
                "item_name": item.name,
                "warning_type": "stock",
                "current_quantity": item.current_quantity,
                "daily_consumption": daily_consumption,
                "weekly_consumption": weekly_consumption,
                "days_remaining": days_remaining,
                "weeks_remaining": weeks_remaining,
                "expiry_date": None,
                "days_to_expiry": None,
                "warning_weeks": item.warning_weeks,
                "expiry_warning_days": item.expiry_warning_days or 7,
                "needs_purchase": True
            })

        if item.production_date and item.shelf_life_days:
            expiry_date = item.production_date + timedelta(days=item.shelf_life_days)
            days_to_expiry = (expiry_date - today).days
            warning_days = default_expiry_warning_days
            if days_to_expiry <= warning_days:
                warnings.append({
                    "item_id": item.id,
                    "item_name": item.name,
                    "warning_type": "expiry",
                    "current_quantity": item.current_quantity,
                    "daily_consumption": daily_consumption,
                    "weekly_consumption": weekly_consumption,
                    "days_remaining": days_remaining,
                    "weeks_remaining": weeks_remaining,
                    "expiry_date": expiry_date,
                    "days_to_expiry": days_to_expiry,
                    "warning_weeks": item.warning_weeks,
                    "expiry_warning_days": warning_days,
                    "needs_purchase": False
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
