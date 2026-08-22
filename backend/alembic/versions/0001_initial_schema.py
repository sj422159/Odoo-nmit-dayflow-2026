"""Initial Dayflow HRMS schema

Revision ID: 0001
Revises:
Create Date: 2026-01-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TS = dict(server_default=sa.text("now()"), nullable=False)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("employee_code", sa.String(24), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(16), nullable=False, server_default="EMPLOYEE"),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **TS),
        sa.CheckConstraint("role IN ('ADMIN','EMPLOYEE')", name="ck_users_role"),
    )
    op.create_index("ix_users_employee_code", "users", ["employee_code"])
    op.create_index("ix_users_email_lower", "users", ["email"], unique=True)

    op.create_table(
        "employees",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("first_name", sa.String(80), nullable=False),
        sa.Column("last_name", sa.String(80), nullable=False),
        sa.Column("phone", sa.String(24), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("department", sa.String(80), nullable=False, server_default="Unassigned"),
        sa.Column("designation", sa.String(80), nullable=False, server_default="Associate"),
        sa.Column("employment_type", sa.String(16), nullable=False, server_default="FULL_TIME"),
        sa.Column("date_of_joining", sa.Date, nullable=False),
        sa.Column("manager_id", sa.Integer, sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **TS),
        sa.CheckConstraint(
            "employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERN')",
            name="ck_employees_employment_type",
        ),
    )
    op.create_index("ix_employees_user_id", "employees", ["user_id"])
    op.create_index("ix_employees_department", "employees", ["department"])

    op.create_table(
        "employee_documents",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("employee_id", sa.Integer, sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("category", sa.String(60), nullable=False, server_default="General"),
        sa.Column("file_url", sa.String(512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), **TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **TS),
    )
    op.create_index("ix_employee_documents_employee_id", "employee_documents", ["employee_id"])

    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("employee_id", sa.Integer, sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_date", sa.Date, nullable=False),
        sa.Column("check_in", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out", sa.DateTime(timezone=True), nullable=True),
        sa.Column("worked_minutes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.String(16), nullable=False, server_default="ABSENT"),
        sa.Column("note", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **TS),
        sa.UniqueConstraint("employee_id", "work_date", name="uq_attendance_employee_date"),
        sa.CheckConstraint("status IN ('PRESENT','ABSENT','HALF_DAY','LEAVE')", name="ck_attendance_status"),
        sa.CheckConstraint("worked_minutes >= 0", name="ck_attendance_worked_minutes"),
    )
    op.create_index("ix_attendance_records_employee_id", "attendance_records", ["employee_id"])
    op.create_index("ix_attendance_records_work_date", "attendance_records", ["work_date"])
    op.create_index("ix_attendance_records_status", "attendance_records", ["status"])

    op.create_table(
        "leave_requests",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("employee_id", sa.Integer, sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("leave_type", sa.String(16), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("days", sa.Integer, nullable=False),
        sa.Column("remarks", sa.Text, nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="PENDING"),
        sa.Column("reviewer_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("review_comment", sa.Text, nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **TS),
        sa.CheckConstraint("leave_type IN ('PAID','SICK','UNPAID')", name="ck_leave_type"),
        sa.CheckConstraint("status IN ('PENDING','APPROVED','REJECTED','CANCELLED')", name="ck_leave_status"),
        sa.CheckConstraint("end_date >= start_date", name="ck_leave_date_order"),
        sa.CheckConstraint("days > 0", name="ck_leave_days_positive"),
    )
    op.create_index("ix_leave_requests_employee_id", "leave_requests", ["employee_id"])
    op.create_index("ix_leave_requests_status", "leave_requests", ["status"])
    op.create_index("ix_leave_requests_start_date", "leave_requests", ["start_date"])

    op.create_table(
        "leave_balances",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("employee_id", sa.Integer, sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("paid_total", sa.Integer, nullable=False, server_default="18"),
        sa.Column("paid_used", sa.Integer, nullable=False, server_default="0"),
        sa.Column("sick_total", sa.Integer, nullable=False, server_default="10"),
        sa.Column("sick_used", sa.Integer, nullable=False, server_default="0"),
        sa.Column("unpaid_used", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), **TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **TS),
        sa.UniqueConstraint("employee_id", "year", name="uq_leave_balance_employee_year"),
        sa.CheckConstraint("paid_used >= 0 AND sick_used >= 0", name="ck_leave_balance_used"),
    )
    op.create_index("ix_leave_balances_employee_id", "leave_balances", ["employee_id"])

    op.create_table(
        "salary_structures",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("employee_id", sa.Integer, sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("basic", sa.Numeric(12, 2), nullable=False),
        sa.Column("hra", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("allowances", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("deductions", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("effective_from", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), **TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **TS),
        sa.UniqueConstraint("employee_id", "effective_from", name="uq_salary_employee_effective"),
        sa.CheckConstraint(
            "basic >= 0 AND hra >= 0 AND allowances >= 0 AND deductions >= 0",
            name="ck_salary_non_negative",
        ),
    )
    op.create_index("ix_salary_structures_employee_id", "salary_structures", ["employee_id"])

    op.create_table(
        "payslips",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("employee_id", sa.Integer, sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period_year", sa.Integer, nullable=False),
        sa.Column("period_month", sa.Integer, nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("working_days", sa.Integer, nullable=False),
        sa.Column("paid_days", sa.Numeric(5, 2), nullable=False),
        sa.Column("lop_days", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("gross", sa.Numeric(12, 2), nullable=False),
        sa.Column("deductions", sa.Numeric(12, 2), nullable=False),
        sa.Column("net_pay", sa.Numeric(12, 2), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), **TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **TS),
        sa.UniqueConstraint("employee_id", "period_year", "period_month", name="uq_payslip_employee_period"),
        sa.CheckConstraint("period_month BETWEEN 1 AND 12", name="ck_payslip_month"),
    )
    op.create_index("ix_payslips_employee_id", "payslips", ["employee_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default="general"),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("link", sa.String(255), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), **TS),
        sa.Column("updated_at", sa.DateTime(timezone=True), **TS),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_category", "notifications", ["category"])


def downgrade() -> None:
    for table in (
        "notifications", "payslips", "salary_structures", "leave_balances",
        "leave_requests", "attendance_records", "employee_documents", "employees", "users",
    ):
        op.drop_table(table)
