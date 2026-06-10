from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, crud
from ..database import get_db

router = APIRouter(prefix="/inventory", tags=["库存管理"])


# ============== Categories ==============
@router.get("/categories", response_model=List[schemas.InventoryCategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return crud.get_inventory_categories(db)


@router.post("/categories", response_model=schemas.InventoryCategoryResponse)
def create_category(category: schemas.InventoryCategoryCreate, db: Session = Depends(get_db)):
    return crud.create_inventory_category(db, category)


@router.put("/categories/{category_id}", response_model=schemas.InventoryCategoryResponse)
def update_category(category_id: int, category: schemas.InventoryCategoryUpdate, db: Session = Depends(get_db)):
    db_category = crud.update_inventory_category(db, category_id, category)
    if not db_category:
        raise HTTPException(status_code=404, detail="分类不存在")
    return db_category


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    db_category = crud.delete_inventory_category(db, category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="分类不存在")
    return {"message": "删除成功"}


# ============== Items ==============
@router.get("/items", response_model=List[schemas.InventoryWithCategory])
def list_items(category_id: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.get_inventory_items(db, category_id=category_id)


@router.post("/items", response_model=schemas.InventoryResponse)
def create_item(item: schemas.InventoryCreate, db: Session = Depends(get_db)):
    return crud.create_inventory_item(db, item)


@router.get("/items/{item_id}", response_model=schemas.InventoryWithCategory)
def get_item(item_id: int, db: Session = Depends(get_db)):
    db_item = crud.get_inventory_item(db, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="物品不存在")
    return db_item


@router.put("/items/{item_id}", response_model=schemas.InventoryResponse)
def update_item(item_id: int, item: schemas.InventoryUpdate, db: Session = Depends(get_db)):
    db_item = crud.update_inventory_item(db, item_id, item)
    if not db_item:
        raise HTTPException(status_code=404, detail="物品不存在")
    return db_item


@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = crud.delete_inventory_item(db, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="物品不存在")
    return {"message": "删除成功"}


# ============== Warnings ==============
@router.get("/warnings", response_model=List[schemas.InventoryWarning])
def get_warnings(db: Session = Depends(get_db)):
    return crud.get_inventory_warnings(db)


# ============== Consumption Records ==============
@router.get("/items/{item_id}/consumptions", response_model=List[schemas.ConsumptionRecordResponse])
def list_consumptions(item_id: int, db: Session = Depends(get_db)):
    return crud.get_consumption_records(db, item_id)


@router.post("/items/{item_id}/consumptions", response_model=schemas.ConsumptionRecordResponse)
def create_consumption(item_id: int, record: schemas.ConsumptionRecordCreate, db: Session = Depends(get_db)):
    db_item = crud.get_inventory_item(db, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="物品不存在")
    return crud.create_consumption_record(db, item_id, record)


@router.delete("/consumptions/{record_id}")
def delete_consumption(record_id: int, db: Session = Depends(get_db)):
    db_record = crud.delete_consumption_record(db, record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"message": "删除成功"}
