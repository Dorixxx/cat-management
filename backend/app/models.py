from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, Text, ForeignKey, Numeric, Table, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from .time_utils import utc_now_naive

task_cats = Table(
    "task_cats", Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("cat_id", Integer, ForeignKey("cats.id", ondelete="CASCADE"), primary_key=True),
)


class Cat(Base):
    __tablename__ = "cats"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    gender = Column(String(10), nullable=False)  # 公/母
    breed = Column(String(100))
    birthday = Column(Date)
    weight = Column(Numeric(5, 2))  # 体重 kg
    color = Column(String(50))
    avatar = Column(Text)  # 头像URL或上传后的图片地址
    notes = Column(Text)
    created_at = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    weight_records = relationship("WeightRecord", back_populates="cat", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="cat", cascade="all, delete-orphan")
    targeted_tasks = relationship("Task", secondary=task_cats, back_populates="cats")
    expenses = relationship("Expense", back_populates="cat", cascade="all, delete-orphan")


class WeightRecord(Base):
    __tablename__ = "weight_records"

    id = Column(Integer, primary_key=True, index=True)
    cat_id = Column(Integer, ForeignKey("cats.id", ondelete="CASCADE"))
    weight = Column(Numeric(5, 2), nullable=False)
    record_date = Column(Date, default=datetime.now)
    notes = Column(Text)
    created_at = Column(DateTime, default=utc_now_naive)

    cat = relationship("Cat", back_populates="weight_records")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    cat_id = Column(Integer, ForeignKey("cats.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    task_type = Column(String(50), nullable=False)  # 剪指甲/驱虫/洗澡/喂食/自定义
    frequency_days = Column(Integer, default=0)  # 0表示一次性任务
    schedule_type = Column(String(20), default="interval")  # temporary/interval/cron
    cron_expression = Column(String(100))
    next_due_date = Column(DateTime, nullable=False)
    reminder_minutes = Column(Integer, default=30)  # 提前提醒分钟数
    completion_target = Column(Integer, default=0)  # 0 表示不限次数
    completed_count = Column(Integer, default=0)
    linked_item_id = Column(Integer, ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)
    linked_item_quantity = Column(Numeric(10, 2), default=0)
    reminder_sent_count = Column(Integer, default=0)
    reminder_cycle_key = Column(String(80))
    is_active = Column(Boolean, default=True)
    bark_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    cat = relationship("Cat", back_populates="tasks")
    cats = relationship("Cat", secondary=task_cats, back_populates="targeted_tasks")
    linked_item = relationship("Inventory")
    completion_records = relationship("TaskCompletion", back_populates="task", cascade="all, delete-orphan")
    cat_completions = relationship("TaskCatCompletion", back_populates="task", cascade="all, delete-orphan")

    @property
    def cat_ids(self):
        return [cat.id for cat in self.cats] if self.cats else ([self.cat_id] if self.cat_id is not None else [])

    @property
    def is_all_cats(self):
        return not self.cats and self.cat_id is None

    @property
    def completed_cat_ids(self):
        return [entry.cat_id for entry in self.cat_completions if entry.cycle_due_date == self.next_due_date]


class TaskCatCompletion(Base):
    __tablename__ = "task_cat_completions"
    __table_args__ = (UniqueConstraint("task_id", "cat_id", "cycle_due_date", name="uq_task_cat_cycle"),)

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    cat_id = Column(Integer, ForeignKey("cats.id", ondelete="CASCADE"), nullable=False)
    cycle_due_date = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, default=utc_now_naive, nullable=False)

    task = relationship("Task", back_populates="cat_completions")


class TaskCompletion(Base):
    __tablename__ = "task_completions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    cat_id = Column(Integer, ForeignKey("cats.id", ondelete="SET NULL"), nullable=True)
    completed_at = Column(DateTime, default=utc_now_naive)
    notes = Column(Text)
    severity = Column(String(20), default="normal")
    linked_item_id = Column(Integer, ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)
    deducted_quantity = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime, default=utc_now_naive)

    task = relationship("Task", back_populates="completion_records")
    linked_item = relationship("Inventory")


class InventoryCategory(Base):
    __tablename__ = "inventory_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    icon = Column(String(50), default="📦")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now_naive)

    items = relationship("Inventory", back_populates="category", cascade="all, delete-orphan")


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("inventory_categories.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(200), nullable=False)
    brand = Column(String(100))
    is_food = Column(Boolean, default=False)
    unit = Column(String(20), nullable=False)  # kg/L/袋/盒
    current_quantity = Column(Numeric(10, 2), default=0)
    weekly_consumption = Column(Numeric(10, 2), default=0)  # 每周消耗量
    daily_consumption = Column(Numeric(10, 2), default=0)  # 每日消耗量
    consumption_unit = Column(String(20))
    warning_threshold = Column(Numeric(10, 2), default=0)  # 预警阈值
    warning_unit = Column(String(20))
    warning_weeks = Column(Numeric(3, 1), default=1.0)  # 提前预警周数
    expiry_warning_days = Column(Integer, default=7)
    production_date = Column(Date)
    shelf_life_days = Column(Integer)
    price_per_unit = Column(Numeric(10, 2), default=0)  # 单价
    purchase_url = Column(String(500))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    category = relationship("InventoryCategory", back_populates="items")
    consumption_records = relationship("ConsumptionRecord", back_populates="item", cascade="all, delete-orphan")


class ConsumptionRecord(Base):
    __tablename__ = "consumption_records"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory.id", ondelete="CASCADE"))
    quantity = Column(Numeric(10, 2), nullable=False)
    record_date = Column(Date, default=datetime.now)
    notes = Column(Text)
    created_at = Column(DateTime, default=utc_now_naive)

    item = relationship("Inventory", back_populates="consumption_records")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    cat_id = Column(Integer, ForeignKey("cats.id", ondelete="SET NULL"), nullable=True)
    category = Column(String(50), nullable=False)  # 食品/用品/医疗/美容/其他
    amount = Column(Numeric(10, 2), nullable=False)
    expense_date = Column(Date, default=datetime.now)
    description = Column(String(500))
    merchant = Column(String(200))
    created_at = Column(DateTime, default=utc_now_naive)

    cat = relationship("Cat", back_populates="expenses")


class BarkConfig(Base):
    __tablename__ = "bark_configs"

    id = Column(Integer, primary_key=True, index=True)
    bark_key = Column(String(255), nullable=False)
    bark_server = Column(String(255), default="https://api.day.app")
    enable_low_stock = Column(Boolean, default=True)
    enable_overdue = Column(Boolean, default=True)
    expiry_warning_days = Column(Integer, default=7)
    task_notification_limit = Column(Integer, default=1)
    created_at = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)
