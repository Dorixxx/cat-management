from datetime import datetime, timezone
from typing import Optional

from .config import settings


def utc_now_naive() -> datetime:
    """Return the current UTC time without tzinfo for legacy DB columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def local_now_naive() -> datetime:
    """Return the current app-local time without tzinfo."""
    return datetime.now(settings.TZINFO).replace(tzinfo=None)


def to_utc_naive(value: Optional[datetime]) -> Optional[datetime]:
    """Normalize inbound datetimes to naive UTC before storing in DB."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=settings.TZINFO).astimezone(timezone.utc).replace(tzinfo=None)
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def utc_naive_to_local_naive(value: datetime) -> datetime:
    """Convert a naive UTC datetime from DB into app-local naive time."""
    return value.replace(tzinfo=timezone.utc).astimezone(settings.TZINFO).replace(tzinfo=None)


def serialize_utc_datetime(value: datetime) -> str:
    """Serialize naive UTC datetimes with an explicit UTC suffix for clients."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")
