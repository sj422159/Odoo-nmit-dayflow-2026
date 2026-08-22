from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class HROfficer(Base, TimestampMixin):
    __tablename__ = "hr_officers"
    __table_args__ = (
        Index("ix_hr_officers_email_lower", "email", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    hr_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(24), nullable=True)

    department: Mapped[str] = mapped_column(String(80), nullable=False, default="Human Resources")
    designation: Mapped[str] = mapped_column(String(80), nullable=False, default="HR Officer")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    created_by_corpadmin_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("corp_admins.id", ondelete="SET NULL"), nullable=True
    )

    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by_corpadmin: Mapped[Optional["CorpAdmin"]] = relationship()  # noqa: F821
    employees: Mapped[List["Employee"]] = relationship(back_populates="hr_officer")  # noqa: F821

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
