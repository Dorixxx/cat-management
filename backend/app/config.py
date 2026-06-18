"""
集中配置管理
支持从环境变量和 .env 文件读取配置
"""
import os
from urllib.parse import quote_plus
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

# 加载 .env 文件（如果存在）
load_dotenv()


def build_database_url() -> str:
    """Resolve the PostgreSQL URL from common platform environment variables."""
    direct_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or os.getenv("POSTGRESQL_URL")
        or os.getenv("POSTGRES_CONNECTION_STRING")
    )
    if direct_url:
        return direct_url

    host = os.getenv("POSTGRES_HOST") or os.getenv("PGHOST")
    database = (
        os.getenv("POSTGRES_DATABASE")
        or os.getenv("POSTGRES_DB")
        or os.getenv("PGDATABASE")
    )
    user = (
        os.getenv("POSTGRES_USER")
        or os.getenv("POSTGRES_USERNAME")
        or os.getenv("PGUSER")
    )
    password = os.getenv("POSTGRES_PASSWORD") or os.getenv("PGPASSWORD")
    port = os.getenv("POSTGRES_PORT") or os.getenv("PGPORT") or "5432"

    if host and database and user and password:
        return (
            f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
            f"@{host}:{port}/{database}"
        )

    app_env = os.getenv("APP_ENV") or os.getenv("ENV") or os.getenv("NODE_ENV")
    if app_env in {"production", "prod"}:
        raise RuntimeError(
            "DATABASE_URL is not configured. Bind a PostgreSQL service in Zeabur "
            "or set DATABASE_URL on the backend service."
        )

    return "postgresql://postgres:postgres@localhost:5432/cat_management"


class Settings:
    """应用配置"""
    
    # 数据库
    DATABASE_URL: str = build_database_url()
    
    # 应用信息
    APP_NAME: str = "🐱 猫咪管理系统"
    APP_VERSION: str = "1.1.0"
    APP_TIMEZONE: str = os.getenv("APP_TIMEZONE", "Asia/Shanghai")

    @property
    def TZINFO(self) -> ZoneInfo:
        return ZoneInfo(self.APP_TIMEZONE)


# 全局配置实例
settings = Settings()
