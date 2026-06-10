from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, crud
from ..database import get_db
from ..services.bark import send_notification

router = APIRouter(prefix="/bark-config", tags=["Bark 推送配置"])


@router.get("/", response_model=schemas.BarkConfigResponse)
def get_config(db: Session = Depends(get_db)):
    """获取当前 Bark 推送配置"""
    config = crud.get_bark_config(db)
    if not config:
        raise HTTPException(status_code=404, detail="未配置 Bark 推送")
    return config


@router.post("/", response_model=schemas.BarkConfigResponse)
def create_config(config: schemas.BarkConfigCreate, db: Session = Depends(get_db)):
    """设置 Bark 推送配置（会覆盖旧配置）"""
    return crud.create_bark_config(db, config)


@router.put("/", response_model=schemas.BarkConfigResponse)
def update_config(config: schemas.BarkConfigUpdate, db: Session = Depends(get_db)):
    """更新 Bark 推送配置"""
    db_config = crud.update_bark_config(db, config)
    if not db_config:
        raise HTTPException(status_code=404, detail="未配置 Bark 推送，请先创建")
    return db_config


@router.post("/test")
def test_notification(payload: schemas.BarkNotificationRequest):
    """使用当前 Bark 配置发送测试推送"""
    ok = send_notification(
        title=payload.title,
        body=payload.body,
        sound=payload.sound or "bell"
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Bark 推送失败，请检查配置")
    return {"message": "推送成功"}
