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
    next_due_date: datetime
    reminder_minutes: int = Field(default=30, ge=0)
    bark_enabled: bool = True


class TaskCreate(TaskBase):
    cat_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    task_type: Optional[str] = None
    frequency_days: Optional[int] = Field(None, ge=0)
    next_due_date: Optional[datetime] = None
    reminder_minutes: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    bark_enabled: Optional[bool] = None
    cat_id: Optional[int] = None


class TaskResponse(TaskBase):
    id: int
    cat_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime

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
    warning_threshold: Optional[Decimal] = Decimal("0")
    warning_weeks: Optional[Decimal] = Decimal("1.0")
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
    warning_threshold: Optional[Decimal] = None
    warning_weeks: Optional[Decimal] = None
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
    current_quantity: Decimal
    weekly_consumption: Decimal
    weeks_remaining: Optional[Decimal]
    warning_weeks: Decimal
    needs_purchase: bool


# ============== Bark Config Schemas ==============
class BarkConfigBase(BaseModel):
    bark_key: str = Field(..., min_length=1, max_length=255)
    bark_server: Optional[str] = Field(default="https://api.day.app", max_length=255)
    enable_low_stock: bool = True
    enable_overdue: bool = True


class BarkConfigCreate(BarkConfigBase):
    pass


class BarkConfigUpdate(BaseModel):
    bark_key: Optional[str] = Field(None, min_length=1, max_length=255)
    bark_server: Optional[str] = Field(None, max_length=255)
    enable_low_stock: Optional[bool] = None
    enable_overdue: Optional[bool] = None


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
