"""Leave balances, overlap checks and approval side effects."""
from datetime import date, datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.leave import LeaveBalance, LeaveRequest
from app.models.enums import LeaveStatus, LeaveType
from app.services.attendance_service import working_days_between


def count_leave_days(start: date, end: date) -> int:
    return len(working_days_between(start, end))


def get_or_create_balance(db: Session, employee_id: int, year: Optional[int] = None) -> LeaveBalance:
    year = year or date.today().year
    balance = db.scalar(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == employee_id, LeaveBalance.year == year
        )
    )
    if balance is None:
        balance = LeaveBalance(
            employee_id=employee_id,
            year=year,
            paid_total=settings.ANNUAL_PAID_LEAVE_DAYS,
            sick_total=settings.ANNUAL_SICK_LEAVE_DAYS,
        )
        db.add(balance)
        db.flush()
    return balance


def overlapping_requests(db: Session, employee_id: int, start: date, end: date) -> List[LeaveRequest]:
    return list(
        db.scalars(
            select(LeaveRequest).where(
                LeaveRequest.employee_id == employee_id,
                LeaveRequest.status.in_([LeaveStatus.PENDING.value, LeaveStatus.APPROVED.value]),
                LeaveRequest.start_date <= end,
                LeaveRequest.end_date >= start,
            )
        )
    )


def pending_days(db: Session, employee_id: int, year: Optional[int] = None) -> int:
    year = year or date.today().year
    rows = db.scalars(
        select(LeaveRequest).where(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == LeaveStatus.PENDING.value,
        )
    )
    return sum(r.days for r in rows if r.start_date.year == year)


def assert_sufficient_balance(db: Session, employee_id: int, leave_type: LeaveType, days: int) -> None:
    if leave_type == LeaveType.UNPAID:
        return
    balance = get_or_create_balance(db, employee_id)
    if leave_type == LeaveType.PAID:
        remaining = balance.paid_total - balance.paid_used
        label = "paid leave"
    else:
        remaining = balance.sick_total - balance.sick_used
        label = "sick leave"
    if days > remaining:
        raise ValueError(
            f"That request needs {days} days of {label} but only {max(remaining, 0)} remain this year."
        )


def apply_approved_balance(db: Session, request: LeaveRequest) -> None:
    balance = get_or_create_balance(db, request.employee_id, request.start_date.year)
    if request.leave_type == LeaveType.PAID.value:
        balance.paid_used += request.days
    elif request.leave_type == LeaveType.SICK.value:
        balance.sick_used += request.days
    else:
        balance.unpaid_used += request.days
    db.flush()


def decide(db: Session, request: LeaveRequest, decision: LeaveStatus, reviewer_id: int, comment: Optional[str]) -> LeaveRequest:
    if request.status != LeaveStatus.PENDING.value:
        raise ValueError(f"This request was already {request.status.lower()}.")
    request.status = decision.value
    request.reviewer_id = reviewer_id
    request.review_comment = comment
    request.reviewed_at = datetime.now(timezone.utc)
    db.flush()
    return request
