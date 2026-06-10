from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, crud
from ..database import get_db

router = APIRouter(prefix="/cats", tags=["猫咪管理"])


@router.get("/", response_model=List[schemas.CatResponse])
def list_cats(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_cats(db, skip=skip, limit=limit)


@router.post("/", response_model=schemas.CatResponse)
def create_cat(cat: schemas.CatCreate, db: Session = Depends(get_db)):
    return crud.create_cat(db, cat)


@router.get("/{cat_id}", response_model=schemas.CatResponse)
def get_cat(cat_id: int, db: Session = Depends(get_db)):
    db_cat = crud.get_cat(db, cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail="猫咪不存在")
    return db_cat


@router.put("/{cat_id}", response_model=schemas.CatResponse)
def update_cat(cat_id: int, cat: schemas.CatUpdate, db: Session = Depends(get_db)):
    db_cat = crud.update_cat(db, cat_id, cat)
    if not db_cat:
        raise HTTPException(status_code=404, detail="猫咪不存在")
    return db_cat


@router.delete("/{cat_id}")
def delete_cat(cat_id: int, db: Session = Depends(get_db)):
    db_cat = crud.delete_cat(db, cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail="猫咪不存在")
    return {"message": "删除成功"}


# ============== Weight Records ==============
@router.get("/{cat_id}/weights", response_model=List[schemas.WeightRecordResponse])
def list_weight_records(cat_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_weight_records(db, cat_id, skip=skip, limit=limit)


@router.post("/{cat_id}/weights", response_model=schemas.WeightRecordResponse)
def create_weight_record(cat_id: int, record: schemas.WeightRecordCreate, db: Session = Depends(get_db)):
    db_cat = crud.get_cat(db, cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail="猫咪不存在")
    return crud.create_weight_record(db, cat_id, record)


@router.delete("/weights/{record_id}")
def delete_weight_record(record_id: int, db: Session = Depends(get_db)):
    db_record = crud.delete_weight_record(db, record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"message": "删除成功"}
