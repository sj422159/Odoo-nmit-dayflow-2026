from datetime import date
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_employee, get_current_user
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import LeaveStatus, LeaveType
from app.models.hr_officer import HROfficer
from app.models.leave import LeaveRequest
from app.models.notification import Notification
from app.schemas.leave import (
    LeaveApplyRequest,
    LeaveBalanceOut,
    LeaveDecisionRequest,
    LeaveOut,
    PaginatedLeaves,
)
from app.services import leave_service as svc
from app.services.attendance_service import mark_leave_days
from app.services.realtime import bus

router = APIRouter(prefix="/leave", tags=["Leave & time off"])


def _out(request: LeaveRequest, employee: Optional[Employee] = None) -> LeaveOut:
    employee = employee or request.employee
    payload = LeaveOut.model_validate(request)
    if employee is not None:
        payload.employee_name = employee.full_name
        payload.employee_code = employee.employee_code
        payload.department = employee.department
    return payload


@router.post("/requests", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
def apply_for_leave(
    payload: LeaveApplyRequest,
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    days = svc.count_leave_days(payload.start_date, payload.end_date)
    if days == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That range covers weekends only. Pick working days.")
    if svc.overlapping_requests(db, employee.id, payload.start_date, payload.end_date):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have a request covering those dates.")
    try:
        svc.assert_sufficient_balance(db, employee.id, payload.leave_type, days)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    request = LeaveRequest(
        employee_id=employee.id,
        leave_type=payload.leave_type.value,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days=days,
        remarks=payload.remarks,
        status=LeaveStatus.PENDING.value,
    )
    db.add(request)
    db.flush()

    for hr in db.scalars(select(HROfficer).where(HROfficer.is_active.is_(True))):
        db.add(
            Notification(
                recipient_type="hr_officers",
                recipient_id=hr.id,
                category="leave",
                title=f"{employee.full_name} requested {days} day(s) of {payload.leave_type.value.lower()} leave",
                body=payload.remarks or "Awaiting decision",
                link="/admin/leave",
            )
        )
    db.commit()
    db.refresh(request)

    result = _out(request, employee)
    bus.publish("leave.created", result.model_dump(), to_admins=True)
    return result


@router.get("/balance/me", response_model=LeaveBalanceOut)
def read_my_balance(
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    b = svc.get_or_create_balance(db, employee.id)
    pending_days = svc.count_pending_days(db, employee.id)
    return LeaveBalanceOut(
        year=b.year,
        paid_total=b.paid_total,
        paid_used=b.paid_used,
        paid_remaining=b.paid_remaining,
        sick_total=b.sick_total,
        sick_used=b.sick_used,
        sick_remaining=b.sick_remaining,
        unpaid_used=b.unpaid_used,
        pending_days=pending_days,
    )


@router.get("/requests/me", response_model=PaginatedLeaves)
def list_my_requests(
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = select(LeaveRequest).where(LeaveRequest.employee_id == employee.id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(
        db.scalars(
            stmt.order_by(LeaveRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        )
    )
    pending = db.scalar(
        select(func.count()).where(
            LeaveRequest.employee_id == employee.id, LeaveRequest.status == LeaveStatus.PENDING.value
        )
    ) or 0

    return PaginatedLeaves(
        items=[_out(req, employee) for req in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(ceil(total / page_size), 1),
        pending_count=pending,
    )


@router.delete("/requests/{request_id}")
def withdraw_request(
    request_id: int,
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    request = db.get(LeaveRequest, request_id)
    if request is None or request.employee_id != employee.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No request with that ID.")
    if request.status != LeaveStatus.PENDING.value:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only pending requests can be withdrawn.")
    request.status = LeaveStatus.CANCELLED.value
    db.commit()
    db.refresh(request)
    result = _out(request, employee)
    bus.publish("leave.cancelled", result.model_dump(), to_admins=True, to_user_ids=[employee.id])
    return result


@router.get("/requests", response_model=PaginatedLeaves)
def list_requests(
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
    leave_status: Optional[LeaveStatus] = None,
    leave_type: Optional[LeaveType] = None,
    department: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = select(LeaveRequest, Employee).join(Employee, Employee.id == LeaveRequest.employee_id)
    if leave_status:
        stmt = stmt.where(LeaveRequest.status == leave_status.value)
    if leave_type:
        stmt = stmt.where(LeaveRequest.leave_type == leave_type.value)
    if department:
        stmt = stmt.where(Employee.department == department)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(
        stmt.order_by(LeaveRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    pending = db.scalar(
        select(func.count()).select_from(LeaveRequest).where(LeaveRequest.status == LeaveStatus.PENDING.value)
    ) or 0

    return PaginatedLeaves(
        items=[_out(request, employee) for request, employee in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(ceil(total / page_size), 1),
        pending_count=pending,
    )


@router.patch("/requests/{request_id}/decision", response_model=LeaveOut)
def decide_request(
    request_id: int,
    payload: LeaveDecisionRequest,
    db: Session = Depends(get_db),
    admin: HROfficer = Depends(get_current_admin),
):
    request = db.get(LeaveRequest, request_id)
    if request is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No request with that ID.")
    employee = db.get(Employee, request.employee_id)

    try:
        svc.decide(db, request, payload.decision, admin.id, payload.comment)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))

    if payload.decision == LeaveStatus.APPROVED:
        svc.apply_approved_balance(db, request)
        mark_leave_days(
            db, request.employee_id, request.start_date, request.end_date,
            f"{request.leave_type.title()} leave approved",
        )

    verb = "approved" if payload.decision == LeaveStatus.APPROVED else "rejected"
    if employee:
        db.add(
            Notification(
                recipient_type="employees",
                recipient_id=employee.id,
                category="leave",
                title=f"Your leave request for {request.start_date:%d %b} was {verb}",
                body=payload.comment,
                link="/leave",
            )
        )
    db.commit()
    db.refresh(request)

    result = _out(request, employee)
    bus.publish(f"leave.{verb}", result.model_dump(), to_admins=True, to_user_ids=[employee.id] if employee else [])
    return result


from app.services.ai_leave_service import evaluate_leave_request_ai


@router.post("/requests/{request_id}/ai-evaluate")
def ai_evaluate_leave(
    request_id: int,
    db: Session = Depends(get_db),
    admin: HROfficer = Depends(get_current_admin),
):
    try:
        return evaluate_leave_request_ai(db, request_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))

