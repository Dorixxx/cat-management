from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# ============== Cat Schemas ==============
class CatBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    gender: str = Field(..., pattern="^(公|母)$")
    breed: Optional[str] = None
    birthday: Optional[date] = None
    weight: Optional[Decimal] = None
    color: Optional[str] = None
    avatar: Optional[str] = None
    notes: Optional[str] = None


class CatCreate(CatBase):
    pass


class CatUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    gender: Optional[str] = Field(None, pattern="^(公|母)$")
    breed: Optional[str] = None
    birthday: Optional[date] = None
    weight: Optional[Decimal] = None
    color: Optional[str] = None
    avatar: Optional[str] = None
    notes: Optional[str] = None


class CatResponse(CatBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============== Weight Record Schemas ==============
class WeightRecordBase(BaseModel):
    weight: Decimal = Field(..., gt=0)
    record_date: Optional[date] = None
    notes: Optional[str] = None


class WeightRecordCreate(WeightRecordBase):
    pass


class WeightRecordResponse(WeightRecordBase):
    id: int
    cat_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Task Schemas ==============
class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    task_type: str = Field(..., min_length=1, max_length=50)
    frequency_days: int = Field(default=0, ge=0)
    schedule_type: str = Field(default="interval", pattern="^(temporary|interval|cron)$")
    cron_expression: Optional[str] = Field(default=None, max_length=100)
    next_due_date: datetime
    reminder_minutes: int = Field(default=30, ge=0)
    completion_target: int = Field(default=0, ge=0)
    linked_item_id: Optional[int] = None
    linked_item_quantity: Optional[Decimal] = Decimal("0")
    reminder_sent_count: int = Field(default=0, ge=0)
    reminder_cycle_key: Optional[str] = None
    bark_enabled: bool = True


class TaskCreate(TaskBase):
    cat_ids: List[int] = Field(default_factory=list)
    cat_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    task_type: Optional[str] = None
    frequency_days: Optional[int] = Field(None, ge=0)
    schedule_type: Optional[str] = Field(None, pattern="^(temporary|interval|cron)$")
    cron_expression: Optional[str] = Field(None, max_length=100)
    next_due_date: Optional[datetime] = None
    reminder_minutes: Optional[int] = Field(None, ge=0)
    completion_target: Optional[int] = Field(None, ge=0)
    linked_item_id: Optional[int] = None
    linked_item_quantity: Optional[Decimal] = None
    reminder_sent_count: Optional[int] = Field(None, ge=0)
    reminder_cycle_key: Optional[str] = None
    is_active: Optional[bool] = None
    bark_enabled: Optional[bool] = None
    cat_ids: Optional[List[int]] = None
    cat_id: Optional[int] = None


class TaskResponse(TaskBase):
    id: int
    cat_id: Optional[int]
    cat_ids: List[int]
    is_all_cats: bool
    completed_cat_ids: List[int]
    completed_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskCompleteRequest(BaseModel):
    cat_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    severity: Optional[str] = Field(default="normal", pattern="^(normal|warning|abnormal)$")


class TaskCompletionResponse(BaseModel):
    id: int
    task_id: int
    completed_at: datetime
    notes: Optional[str]
    severity: str
    linked_item_id: Optional[int]
    deducted_quantity: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Inventory Category Schemas ==============
class InventoryCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: Optional[str] = "📦"
    sort_order: Optional[int] = 0


class InventoryCategoryCreate(InventoryCategoryBase):
    pass


class InventoryCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    sort_order: Optional[int] = None


class InventoryCategoryResponse(InventoryCategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Inventory Schemas ==============
class InventoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    unit: str = Field(..., min_length=1, max_length=20)
    current_quantity: Optional[Decimal] = Decimal("0")
    weekly_consumption: Optional[Decimal] = Decimal("0")
    daily_consumption: Optional[Decimal] = Decimal("0")
    warning_threshold: Optional[Decimal] = Decimal("0")
    warning_weeks: Optional[Decimal] = Decimal("1.0")
    expiry_warning_days: Optional[int] = Field(default=7, ge=0)
    production_date: Optional[date] = None
    shelf_life_days: Optional[int] = Field(default=None, ge=0)
    price_per_unit: Optional[Decimal] = Decimal("0")
    purchase_url: Optional[str] = None
    notes: Optional[str] = None


class InventoryCreate(InventoryBase):
    category_id: Optional[int] = None


class InventoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    current_quantity: Optional[Decimal] = None
    weekly_consumption: Optional[Decimal] = None
    daily_consumption: Optional[Decimal] = None
    warning_threshold: Optional[Decimal] = None
    warning_weeks: Optional[Decimal] = None
    expiry_warning_days: Optional[int] = Field(None, ge=0)
    production_date: Optional[date] = None
    shelf_life_days: Optional[int] = Field(None, ge=0)
    price_per_unit: Optional[Decimal] = None
    purchase_url: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class InventoryResponse(InventoryBase):
    id: int
    category_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryWithCategory(InventoryResponse):
    category: Optional[InventoryCategoryResponse] = None

    class Config:
        from_attributes = True


# ============== Consumption Record Schemas ==============
class ConsumptionRecordBase(BaseModel):
    quantity: Decimal = Field(..., gt=0)
    record_date: Optional[date] = None
    notes: Optional[str] = None


class ConsumptionRecordCreate(ConsumptionRecordBase):
    pass


class ConsumptionRecordResponse(ConsumptionRecordBase):
    id: int
    item_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Expense Schemas ==============
class ExpenseBase(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    amount: Decimal = Field(..., gt=0)
    expense_date: Optional[date] = None
    description: Optional[str] = None
    merchant: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    cat_id: Optional[int] = None


class ExpenseUpdate(BaseModel):
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    amount: Optional[Decimal] = Field(None, gt=0)
    expense_date: Optional[date] = None
    description: Optional[str] = None
    merchant: Optional[str] = None
    cat_id: Optional[int] = None


class ExpenseResponse(ExpenseBase):
    id: int
    cat_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseWithCat(ExpenseResponse):
    cat: Optional[CatResponse] = None

    class Config:
        from_attributes = True


# ============== Statistics Schemas ==============
class ExpenseSummary(BaseModel):
    category: str
    total: Decimal
    count: int


class ExpenseStats(BaseModel):
    start_date: date
    end_date: date
    total_amount: Decimal
    by_category: List[ExpenseSummary]
    by_month: List[dict]


class InventoryWarning(BaseModel):
    item_id: int
    item_name: str
    warning_type: str = "stock"
    current_quantity: Decimal
    daily_consumption: Decimal = Decimal("0")
    weekly_consumption: Decimal = Decimal("0")
    days_remaining: Optional[Decimal] = None
    weeks_remaining: Optional[Decimal]
    expiry_date: Optional[date] = None
    days_to_expiry: Optional[int] = None
    warning_weeks: Decimal = Decimal("1.0")
    expiry_warning_days: int = 7
    needs_purchase: bool


# ============== Bark Config Schemas ==============
class BarkConfigBase(BaseModel):
    bark_key: str = Field(..., min_length=1, max_length=255)
    bark_server: Optional[str] = Field(default="https://api.day.app", max_length=255)
    enable_low_stock: bool = True
    enable_overdue: bool = True
    expiry_warning_days: int = Field(default=7, ge=0)
    task_notification_limit: int = Field(default=1, ge=0)


class BarkConfigCreate(BarkConfigBase):
    pass


class BarkConfigUpdate(BaseModel):
    bark_key: Optional[str] = Field(None, min_length=1, max_length=255)
    bark_server: Optional[str] = Field(None, max_length=255)
    enable_low_stock: Optional[bool] = None
    enable_overdue: Optional[bool] = None
    expiry_warning_days: Optional[int] = Field(None, ge=0)
    task_notification_limit: Optional[int] = Field(None, ge=0)


class BarkConfigResponse(BarkConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BarkNotificationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=1000)
    sound: Optional[str] = Field(default="bell", max_length=50)
