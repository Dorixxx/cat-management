import os

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta

from ..database import SessionLocal
from .. import crud
from .bark import send_task_reminder, send_inventory_warning, send_expiry_warning
from ..time_utils import local_now_naive, to_utc_naive, utc_now_naive

scheduler = BackgroundScheduler(
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
    }
)


def _task_cycle_key(task) -> str:
    return task.next_due_date.replace(second=0, microsecond=0).isoformat()


def check_tasks():
    """检查即将到期的任务并发送提醒"""
    db = SessionLocal()
    try:
        config = crud.get_bark_config(db)
        if not config or not config.enable_overdue:
            return

        limit = 1 if config.task_notification_limit is None else max(0, int(config.task_notification_limit))
        if limit == 0:
            return

        # 检查未来30分钟内到期的任务
        tasks = crud.get_due_tasks(db, minutes=30)
        for task in tasks:
            cat_name = task.cat.name if task.cat else None
            if not task.bark_enabled:
                continue

            cycle_key = _task_cycle_key(task)
            if task.reminder_cycle_key != cycle_key:
                task.reminder_cycle_key = cycle_key
                task.reminder_sent_count = 0

            if (task.reminder_sent_count or 0) >= limit:
                continue

            sent = send_task_reminder(
                    task_title=task.title,
                    task_description=task.description,
                    cat_name=cat_name
                )
            if sent:
                task.reminder_sent_count = (task.reminder_sent_count or 0) + 1
                db.commit()
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
            if warning["warning_type"] == "expiry":
                send_expiry_warning(
                    item_name=warning["item_name"],
                    days_to_expiry=warning["days_to_expiry"],
                    expiry_date=str(warning["expiry_date"]) if warning["expiry_date"] else None
                )
            else:
                send_inventory_warning(
                    item_name=warning["item_name"],
                    current=float(warning["current_quantity"]),
                    weeks_remaining=float(warning["weeks_remaining"]) if warning["weeks_remaining"] else None
                )
    finally:
        db.close()


def start_scheduler():
    """启动定时任务调度器"""
    enabled = os.getenv("ENABLE_SCHEDULER", "true").strip().lower()
    if enabled not in {"1", "true", "yes", "on"}:
        print("[Scheduler] 定时任务调度器已禁用")
        return

    if scheduler.running:
        print("[Scheduler] 定时任务调度器已在运行，跳过重复启动")
        return

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
        trigger=IntervalTrigger(hours=24, start_date=to_utc_naive(local_now_naive().replace(hour=9, minute=0, second=0, microsecond=0))),
        id="check_inventory",
        replace_existing=True
    )
    
    scheduler.start()
    print("[Scheduler] 定时任务调度器已启动")


def shutdown_scheduler():
    """关闭定时任务调度器"""
    if scheduler.running:
        scheduler.shutdown()
        print("[Scheduler] 定时任务调度器已关闭")
