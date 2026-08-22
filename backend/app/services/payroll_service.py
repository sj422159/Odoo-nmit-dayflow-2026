"""Payroll computation. Pandas aggregates attendance into paid/LOP days."""
import calendar
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.enums import AttendanceStatus
from app.models.payroll import Payslip, SalaryStructure
from app.services.attendance_service import working_days_between

CREDIT = {
    AttendanceStatus.PRESENT.value: 1.0,
    AttendanceStatus.LEAVE.value: 1.0,     # approved leave is paid at the balance level
    AttendanceStatus.HALF_DAY.value: 0.5,
    AttendanceStatus.ABSENT.value: 0.0,
}


def money(value) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def period_bounds(year: int, month: int) -> Tuple[date, date]:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def current_structure(db: Session, employee_id: int, on: Optional[date] = None) -> Optional[SalaryStructure]:
    on = on or date.today()
    return db.scalar(
        select(SalaryStructure)
        .where(SalaryStructure.employee_id == employee_id, SalaryStructure.effective_from <= on)
        .order_by(SalaryStructure.effective_from.desc())
        .limit(1)
    )


def attendance_frame(db: Session, start: date, end: date) -> pd.DataFrame:
    rows = db.execute(
        select(
            AttendanceRecord.employee_id,
            AttendanceRecord.work_date,
            AttendanceRecord.status,
            AttendanceRecord.worked_minutes,
        ).where(AttendanceRecord.work_date >= start, AttendanceRecord.work_date <= end)
    ).all()
    frame = pd.DataFrame(rows, columns=["employee_id", "work_date", "status", "worked_minutes"])
    if frame.empty:
        return pd.DataFrame(columns=["employee_id", "work_date", "status", "worked_minutes", "credit"])
    frame["work_date"] = pd.to_datetime(frame["work_date"])
    frame["credit"] = frame["status"].map(CREDIT).fillna(0.0)
    return frame


def paid_days_by_employee(db: Session, start: date, end: date) -> Dict[int, float]:
    frame = attendance_frame(db, start, end)
    if frame.empty:
        return {}
    workdays = {pd.Timestamp(d) for d in working_days_between(start, end)}
    frame = frame[frame["work_date"].isin(workdays)]
    if frame.empty:
        return {}
    grouped = frame.groupby("employee_id")["credit"].sum()
    return {int(k): float(v) for k, v in grouped.items()}


def run_payroll(db: Session, year: int, month: int) -> Tuple[int, int, Decimal, str]:
    """Generate or refresh payslips for a period. Returns (created, updated, total_net, currency)."""
    start, end = period_bounds(year, month)
    total_workdays = len(working_days_between(start, end))
    credits = paid_days_by_employee(db, start, end)

    employees = list(db.scalars(select(Employee).join(Employee.user)))
    created = updated = 0
    total_net = Decimal("0.00")
    currency = "INR"

    for employee in employees:
        structure = current_structure(db, employee.id, end)
        if structure is None:
            continue
        currency = structure.currency
        paid = min(float(credits.get(employee.id, 0.0)), float(total_workdays))
        lop = max(float(total_workdays) - paid, 0.0)
        ratio = Decimal(paid) / Decimal(total_workdays) if total_workdays else Decimal(0)

        gross = money(structure.gross_monthly * ratio)
        deductions = money(Decimal(structure.deductions) * ratio)
        net = money(gross - deductions)

        existing = db.scalar(
            select(Payslip).where(
                Payslip.employee_id == employee.id,
                Payslip.period_year == year,
                Payslip.period_month == month,
            )
        )
        if existing is None:
            existing = Payslip(employee_id=employee.id, period_year=year, period_month=month)
            db.add(existing)
            created += 1
        else:
            updated += 1

        existing.currency = structure.currency
        existing.working_days = total_workdays
        existing.paid_days = money(paid)
        existing.lop_days = money(lop)
        existing.gross = gross
        existing.deductions = deductions
        existing.net_pay = net
        existing.generated_at = datetime.now(timezone.utc)
        total_net += net

    db.flush()
    return created, updated, money(total_net), currency
