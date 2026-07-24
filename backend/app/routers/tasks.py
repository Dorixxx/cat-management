from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, crud
from ..database import get_db

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
def complete_task(task_id: int, completion: schemas.TaskComplete = None, db: Session = Depends(get_db)):
    try:
        db_task = crud.complete_task(task_id=task_id, db=db, cat_id=completion.cat_id if completion else None)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return db_task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.delete_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"message": "删除成功"}
