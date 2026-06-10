"""
集中配置管理
支持从环境变量和 .env 文件读取配置
"""
import os
from dotenv import load_dotenv

# 加载 .env 文件（如果存在）
load_dotenv()


class Settings:
    """应用配置"""
    
    # 数据库
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://root:YVki3h4R7LHZ9oj8JT05y2Mve6Dm1EfK@43.156.171.106:32595/zeabur"
    )
    
    # 应用信息
    APP_NAME: str = "🐱 猫咪管理系统"
    APP_VERSION: str = "1.1.0"


# 全局配置实例
settings = Settings()
