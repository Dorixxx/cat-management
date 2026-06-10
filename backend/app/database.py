from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import inspect, text

from .config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema_updates():
    """Apply tiny compatibility updates for databases created before this version."""
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    statements = []

    def add_missing_columns(table_name: str, columns: dict):
        if table_name not in table_names:
            return
        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        for column_name, ddl in columns.items():
            if column_name not in existing_columns:
                statements.append(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}")

    add_missing_columns("bark_configs", {
        "enable_low_stock": "BOOLEAN DEFAULT TRUE",
        "enable_overdue": "BOOLEAN DEFAULT TRUE",
        "expiry_warning_days": "INTEGER DEFAULT 7",
    })
    add_missing_columns("inventory", {
        "daily_consumption": "NUMERIC(10, 2) DEFAULT 0",
        "expiry_warning_days": "INTEGER DEFAULT 7",
        "production_date": "DATE",
        "shelf_life_days": "INTEGER",
    })
    add_missing_columns("tasks", {
        "completion_target": "INTEGER DEFAULT 0",
        "completed_count": "INTEGER DEFAULT 0",
        "linked_item_id": "INTEGER",
        "linked_item_quantity": "NUMERIC(10, 2) DEFAULT 0",
        "schedule_type": "VARCHAR(20) DEFAULT 'interval'",
        "cron_expression": "VARCHAR(100)",
    })

    if statements:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))
