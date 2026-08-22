"""Declarative base + model registry (imported by Alembic)."""
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


# Imported for their side effect: registering tables on Base.metadata.
from app.models import (  # noqa: E402,F401
    attendance,
    employee,
    leave,
    notification,
    payroll,
    user,
)
