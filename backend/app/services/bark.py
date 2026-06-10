import requests

from .config import settings


def send_notification(title: str, body: str, url: str = None, sound: str = "bell") -> bool:
    """发送 Bark 推送通知到手机"""
    if not settings.BARK_KEY:
        print("[Bark] 未配置 BARK_KEY，跳过推送")
        return False
    
    try:
        push_url = f"{settings.BARK_SERVER}/{settings.BARK_KEY}/{title}/{body}"
        params = {"sound": sound}
        if url:
            params["url"] = url
        
        response = requests.get(push_url, params=params, timeout=10)
        result = response.json()
        
        if result.get("code") == 200:
            print(f"[Bark] 推送成功: {title}")
            return True
        else:
            print(f"[Bark] 推送失败: {result}")
            return False
    except Exception as e:
        print(f"[Bark] 推送异常: {e}")
        return False


def send_task_reminder(task_title: str, task_description: str = None, cat_name: str = None) -> bool:
    """发送任务提醒"""
    title = f"🐱 猫咪任务提醒"
    body = f"任务: {task_title}"
    if cat_name:
        body += f"\n猫咪: {cat_name}"
    if task_description:
        body += f"\n备注: {task_description}"
    
    return send_notification(title, body, sound="bell")


def send_inventory_warning(item_name: str, current: float, weeks_remaining: float = None) -> bool:
    """发送库存预警"""
    title = f"⚠️ 库存预警"
    if weeks_remaining is not None:
        body = f"{item_name} 库存不足\n预计还可使用 {weeks_remaining:.1f} 周"
    else:
        body = f"{item_name} 库存已到达预警线，请及时补充！"
    
    return send_notification(title, body, sound="alarm")
