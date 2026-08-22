from datetime import date, datetime
from typing import Optional

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import LeaveStatus, LeaveType


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"
    __table_args__ = (
        CheckConstraint("leave_type IN ('PAID','SICK','UNPAID')", name="ck_leave_type"),
        CheckConstraint(
            "status IN ('PENDING','APPROVED','REJECTED','CANCELLED')", name="ck_leave_status"
        ),
        CheckConstraint("end_date >= start_date", name="ck_leave_date_order"),
        CheckConstraint("days > 0", name="ck_leave_days_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    leave_type: Mapped[str] = mapped_column(String(16), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    days: Mapped[int] = mapped_column(Integer, nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=LeaveStatus.PENDING.value, index=True
    )
    reviewer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    employee: Mapped["Employee"] = relationship()  # noqa: F821
    reviewer: Mapped[Optional["User"]] = relationship()  # noqa: F821


class LeaveBalance(Base, TimestampMixin):
    __tablename__ = "leave_balances"
    __table_args__ = (
        UniqueConstraint("employee_id", "year", name="uq_leave_balance_employee_year"),
        CheckConstraint("paid_used >= 0 AND sick_used >= 0", name="ck_leave_balance_used"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    paid_total: Mapped[int] = mapped_column(Integer, nullable=False, default=18)
    paid_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sick_total: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    sick_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unpaid_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    employee: Mapped["Employee"] = relationship()  # noqa: F821
