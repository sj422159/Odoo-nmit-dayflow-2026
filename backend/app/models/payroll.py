from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class SalaryStructure(Base, TimestampMixin):
    __tablename__ = "salary_structures"
    __table_args__ = (
        UniqueConstraint("employee_id", "effective_from", name="uq_salary_employee_effective"),
        CheckConstraint("basic >= 0 AND hra >= 0 AND allowances >= 0 AND deductions >= 0",
                        name="ck_salary_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    basic: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    hra: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    allowances: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)

    employee: Mapped["Employee"] = relationship()  # noqa: F821

    @property
    def gross_monthly(self) -> Decimal:
        return Decimal(self.basic) + Decimal(self.hra) + Decimal(self.allowances)

    @property
    def net_monthly(self) -> Decimal:
        return self.gross_monthly - Decimal(self.deductions)


class Payslip(Base, TimestampMixin):
    __tablename__ = "payslips"
    __table_args__ = (
        UniqueConstraint("employee_id", "period_year", "period_month", name="uq_payslip_employee_period"),
        CheckConstraint("period_month BETWEEN 1 AND 12", name="ck_payslip_month"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    working_days: Mapped[int] = mapped_column(Integer, nullable=False)
    paid_days: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    lop_days: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    gross: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    net_pay: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    employee: Mapped["Employee"] = relationship()  # noqa: F821
