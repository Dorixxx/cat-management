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
    return crud.create_task(db, task)


@router.get("/completions/all", response_model=List[schemas.TaskCompletionResponse])
def list_all_task_completions(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return crud.get_all_task_completions(db, skip=skip, limit=limit)


@router.get("/{task_id}", response_model=schemas.TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return db_task


@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = crud.update_task(db, task_id, task)
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return db_task


@router.post("/{task_id}/complete", response_model=schemas.TaskResponse)
def complete_task(
    task_id: int,
    completion: Optional[schemas.TaskCompleteRequest] = None,
    db: Session = Depends(get_db)
):
    db_task = crud.complete_task(db, task_id, completion or schemas.TaskCompleteRequest())
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
