from datetime import date
from typing import List, Optional

from sqlalchemy import CheckConstraint, Date, ForeignKey, String, Text
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
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(24), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    department: Mapped[str] = mapped_column(String(80), nullable=False, default="Unassigned", index=True)
    designation: Mapped[str] = mapped_column(String(80), nullable=False, default="Associate")
    employment_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default=EmploymentType.FULL_TIME.value
    )
    date_of_joining: Mapped[date] = mapped_column(Date, nullable=False)
    manager_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="employee")  # noqa: F821
    manager: Mapped[Optional["Employee"]] = relationship(remote_side="Employee.id")
    documents: Mapped[List["EmployeeDocument"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class EmployeeDocument(Base, TimestampMixin):
    __tablename__ = "employee_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False, default="General")
    file_url: Mapped[str] = mapped_column(String(512), nullable=False)

    employee: Mapped["Employee"] = relationship(back_populates="documents")
