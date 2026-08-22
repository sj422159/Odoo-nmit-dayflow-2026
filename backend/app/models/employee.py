from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import EmploymentType


class Employee(Base, TimestampMixin):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint(
            "employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERN')",
            name="ck_employees_employment_type",
        ),
        Index("ix_employees_email_lower", "email", unique=True),
        Index("ix_employees_employee_code", "employee_code"),
        Index("ix_employees_department", "department"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(24), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    department: Mapped[str] = mapped_column(String(80), nullable=False, default="Unassigned")
    designation: Mapped[str] = mapped_column(String(80), nullable=False, default="Associate")
    employment_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default=EmploymentType.FULL_TIME.value
    )
    date_of_joining: Mapped[date] = mapped_column(Date, nullable=False)
    hr_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("hr_officers.id", ondelete="SET NULL"), nullable=True
    )
    manager_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    manager: Mapped[Optional["Employee"]] = relationship(remote_side="Employee.id")
    documents: Mapped[List["EmployeeDocument"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def role(self) -> str:
        return "EMPLOYEE"


class EmployeeDocument(Base, TimestampMixin):
    __tablename__ = "employee_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_type: Mapped[str] = mapped_column(String(60), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    employee: Mapped["Employee"] = relationship(back_populates="documents")
