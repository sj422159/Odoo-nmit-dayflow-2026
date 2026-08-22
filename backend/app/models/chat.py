from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class ChatMessage(Base, TimestampMixin):
    """Stores direct 1-on-1 messages between employees/HR and broadcast announcements."""

    __tablename__ = "chat_messages"
    __table_args__ = (
        Index("ix_chat_messages_channel", "recipient_type", "recipient_id"),
        Index("ix_chat_messages_sender", "sender_type", "sender_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sender_type: Mapped[str] = mapped_column(String(30), nullable=False)  # EMPLOYEE, HR_ADMIN, CORPORATE
    sender_id: Mapped[int] = mapped_column(nullable=False)
    sender_name: Mapped[str] = mapped_column(String(120), nullable=False)
    recipient_type: Mapped[str] = mapped_column(String(30), nullable=False)  # EMPLOYEE, HR_ADMIN, CORPORATE, ALL, DEPARTMENT
    recipient_id: Mapped[Optional[int]] = mapped_column(nullable=True)
    target_department: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    message_type: Mapped[str] = mapped_column(String(20), nullable=False, default="DIRECT")  # DIRECT, ANNOUNCEMENT
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
