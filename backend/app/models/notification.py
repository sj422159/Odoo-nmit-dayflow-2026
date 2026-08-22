from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Notification(Base, TimestampMixin):
    """Activity feed entries; also pushed live over the WebSocket channel."""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_recipient", "recipient_type", "recipient_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    recipient_type: Mapped[str] = mapped_column(String(30), nullable=False, default="employees")
    recipient_id: Mapped[int] = mapped_column(nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="general", index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    link: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
