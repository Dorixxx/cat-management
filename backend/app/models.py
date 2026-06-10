from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Cat(Base):
    __tablename__ = "cats"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    gender = Column(String(10), nullable=False)  # 公/母
    breed = Column(String(100))
    birthday = Column(Date)
    weight = Column(Numeric(5, 2))  # 体重 kg
    color = Column(String(50))
    avatar = Column(String(255))  # 头像URL
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    weight_records = relationship("WeightRecord", back_populates="cat", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="cat", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="cat", cascade="all, delete-orphan")


class WeightRecord(Base):
    __tablename__ = "weight_records"

    id = Column(Integer, primary_key=True, index=True)
    cat_id = Column(Integer, ForeignKey("cats.id", ondelete="CASCADE"))
    weight = Column(Numeric(5, 2), nullable=False)
    record_date = Column(Date, default=datetime.now)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    cat = relationship("Cat", back_populates="weight_records")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    cat_id = Column(Integer, ForeignKey("cats.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    task_type = Column(String(50), nullable=False)  # 剪指甲/驱虫/洗澡/喂食/自定义
    frequency_days = Column(Integer, default=0)  # 0表示一次性任务
    next_due_date = Column(DateTime, nullable=False)
    reminder_minutes = Column(Integer, default=30)  # 提前提醒分钟数
    completion_target = Column(Integer, default=0)  # 0 表示不限次数
    completed_count = Column(Integer, default=0)
    linked_item_id = Column(Integer, ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)
    linked_item_quantity = Column(Numeric(10, 2), default=0)
    is_active = Column(Boolean, default=True)
    bark_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    cat = relationship("Cat", back_populates="tasks")
    linked_item = relationship("Inventory")
    completion_records = relationship("TaskCompletion", back_populates="task", cascade="all, delete-orphan")


class TaskCompletion(Base):
    __tablename__ = "task_completions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    completed_at = Column(DateTime, default=datetime.now)
    notes = Column(Text)
    linked_item_id = Column(Integer, ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True)
    deducted_quantity = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime, default=datetime.now)

    task = relationship("Task", back_populates="completion_records")
    linked_item = relationship("Inventory")


class InventoryCategory(Base):
    __tablename__ = "inventory_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    icon = Column(String(50), default="📦")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)

    items = relationship("Inventory", back_populates="category", cascade="all, delete-orphan")


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("inventory_categories.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(200), nullable=False)
    unit = Column(String(20), nullable=False)  # kg/L/袋/盒
    current_quantity = Column(Numeric(10, 2), default=0)
    weekly_consumption = Column(Numeric(10, 2), default=0)  # 每周消耗量
    daily_consumption = Column(Numeric(10, 2), default=0)  # 每日消耗量
    warning_threshold = Column(Numeric(10, 2), default=0)  # 预警阈值
    warning_weeks = Column(Numeric(3, 1), default=1.0)  # 提前预警周数
    expiry_warning_days = Column(Integer, default=7)
    production_date = Column(Date)
    shelf_life_days = Column(Integer)
    price_per_unit = Column(Numeric(10, 2), default=0)  # 单价
    purchase_url = Column(String(500))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    category = relationship("InventoryCategory", back_populates="items")
    consumption_records = relationship("ConsumptionRecord", back_populates="item", cascade="all, delete-orphan")


class ConsumptionRecord(Base):
    __tablename__ = "consumption_records"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory.id", ondelete="CASCADE"))
    quantity = Column(Numeric(10, 2), nullable=False)
    record_date = Column(Date, default=datetime.now)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

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
    created_at = Column(DateTime, default=datetime.now)

    cat = relationship("Cat", back_populates="expenses")


class BarkConfig(Base):
    __tablename__ = "bark_configs"

    id = Column(Integer, primary_key=True, index=True)
    bark_key = Column(String(255), nullable=False)
    bark_server = Column(String(255), default="https://api.day.app")
    enable_low_stock = Column(Boolean, default=True)
    enable_overdue = Column(Boolean, default=True)
    expiry_warning_days = Column(Integer, default=7)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
