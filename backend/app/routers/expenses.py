from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from .. import schemas, crud
from ..database import get_db

router = APIRouter(prefix="/expenses", tags=["花费统计"])


@router.get("/", response_model=List[schemas.ExpenseWithCat])
def list_expenses(
    cat_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.get_expenses(db, cat_id=cat_id, start_date=start_date, end_date=end_date, skip=skip, limit=limit)


@router.post("/", response_model=schemas.ExpenseResponse)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    return crud.create_expense(db, expense)


@router.get("/{expense_id}", response_model=schemas.ExpenseWithCat)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    db_expense = crud.get_expense(db, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="记录不存在")
    return db_expense


@router.put("/{expense_id}", response_model=schemas.ExpenseResponse)
def update_expense(expense_id: int, expense: schemas.ExpenseUpdate, db: Session = Depends(get_db)):
    db_expense = crud.update_expense(db, expense_id, expense)
    if not db_expense:
        raise HTTPException(status_code=404, detail="记录不存在")
    return db_expense


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    db_expense = crud.delete_expense(db, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"message": "删除成功"}


@router.get("/stats/summary", response_model=schemas.ExpenseStats)
def get_statistics(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    return crud.get_expense_statistics(db, start_date, end_date)
