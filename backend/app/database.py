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
    if "bark_configs" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("bark_configs")}
    statements = []
    if "enable_low_stock" not in existing_columns:
        statements.append("ALTER TABLE bark_configs ADD COLUMN enable_low_stock BOOLEAN DEFAULT TRUE")
    if "enable_overdue" not in existing_columns:
        statements.append("ALTER TABLE bark_configs ADD COLUMN enable_overdue BOOLEAN DEFAULT TRUE")

    if statements:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))
