from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ..database import SessionLocal
from .. import crud
from .bark import send_task_reminder, send_inventory_warning

scheduler = BackgroundScheduler()


def check_tasks():
    """检查即将到期的任务并发送提醒"""
    db = SessionLocal()
    try:
        config = crud.get_bark_config(db)
        if not config or not config.enable_overdue:
            return

        # 检查未来30分钟内到期的任务
        tasks = crud.get_due_tasks(db, minutes=30)
        for task in tasks:
            cat_name = task.cat.name if task.cat else None
            if task.bark_enabled:
                send_task_reminder(
                    task_title=task.title,
                    task_description=task.description,
                    cat_name=cat_name
                )
    finally:
        db.close()


def check_inventory():
    """检查库存预警"""
    db = SessionLocal()
    try:
        config = crud.get_bark_config(db)
        if not config or not config.enable_low_stock:
            return

        warnings = crud.get_inventory_warnings(db)
        for warning in warnings:
            send_inventory_warning(
                item_name=warning["item_name"],
                current=float(warning["current_quantity"]),
                weeks_remaining=float(warning["weeks_remaining"]) if warning["weeks_remaining"] else None
            )
    finally:
        db.close()


def start_scheduler():
    """启动定时任务调度器"""
    # 每5分钟检查一次任务
    scheduler.add_job(
        check_tasks,
        trigger=IntervalTrigger(minutes=5),
        id="check_tasks",
        replace_existing=True
    )
    
    # 每天上午9点检查库存
    scheduler.add_job(
        check_inventory,
        trigger=IntervalTrigger(hours=24, start_date=datetime.now().replace(hour=9, minute=0, second=0)),
        id="check_inventory",
        replace_existing=True
    )
    
    scheduler.start()
    print("[Scheduler] 定时任务调度器已启动")


def shutdown_scheduler():
    """关闭定时任务调度器"""
    scheduler.shutdown()
    print("[Scheduler] 定时任务调度器已关闭")
