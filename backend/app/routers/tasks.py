from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, crud
from ..database import get_db
from ..time_utils import to_utc_naive

router = APIRouter(prefix="/tasks", tags=["任务提醒"])


@router.get("/", response_model=List[schemas.TaskResponse])
def list_tasks(cat_id: Optional[int] = None, active_only: bool = False, db: Session = Depends(get_db)):
    return crud.get_tasks(db, cat_id=cat_id, active_only=active_only)


@router.post("/", response_model=schemas.TaskResponse)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_task(db, task)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/completions/all", response_model=List[schemas.TaskCompletionResponse])
def list_all_task_completions(
    skip: int = 0,
    limit: int = 500,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    task_id: Optional[int] = None,
    schedule_type: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return crud.get_all_task_completions(
        db,
        skip=skip,
        limit=limit,
        start_date=to_utc_naive(start_date) if start_date else None,
        end_date=to_utc_naive(end_date) if end_date else None,
        task_id=task_id,
        schedule_type=schedule_type,
        severity=severity,
    )


@router.get("/{task_id}", response_model=schemas.TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return db_task


@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db)):
    try:
        db_task = crud.update_task(db, task_id, task)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return db_task


@router.post("/{task_id}/complete", response_model=schemas.TaskResponse)
def complete_task(
    task_id: int,
    completion: Optional[schemas.TaskCompleteRequest] = None,
    db: Session = Depends(get_db)
):
    try:
        db_task = crud.complete_task(db, task_id, completion or schemas.TaskCompleteRequest())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return db_task


@router.get("/{task_id}/completions", response_model=List[schemas.TaskCompletionResponse])
def list_task_completions(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return crud.get_task_completions(db, task_id)


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.delete_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"message": "删除成功"}
