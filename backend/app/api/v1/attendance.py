from datetime import date, timedelta
from typing import Any, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_authenticated_account,
    get_current_employee,
    get_current_hr_or_corp_admin,
)
from app.db.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.enums import AttendanceStatus, Role
from app.schemas.attendance import (
    AttendanceAdminUpsert,
    AttendanceOut,
    AttendanceSummary,
    TodayStatus,
)
from app.services import attendance_service as svc
from app.services.realtime import bus

router = APIRouter(prefix="/attendance", tags=["Attendance"])

MAX_RANGE_DAYS = 186


def _out(record: AttendanceRecord, employee: Optional[Employee] = None) -> AttendanceOut:
    payload = AttendanceOut.model_validate(record)
    employee = employee or record.employee
    if employee is not None:
        payload.employee_name = employee.full_name
        payload.employee_code = employee.employee_code
    return payload


def _resolve_range(start: Optional[date], end: Optional[date]) -> tuple[date, date]:
    end = end or date.today()
    start = start or (end - timedelta(days=29))
    if start > end:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The start date must come before the end date.")
    if (end - start).days > MAX_RANGE_DAYS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Pick a range of {MAX_RANGE_DAYS} days or fewer.")
    return start, end


@router.get("/me/today", response_model=TodayStatus)
def today_status(employee: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    record = svc.get_record(db, employee.id, date.today())
    return TodayStatus(
        work_date=date.today(),
        checked_in=bool(record and record.check_in),
        checked_out=bool(record and record.check_out),
        check_in=record.check_in if record else None,
        check_out=record.check_out if record else None,
        worked_minutes=record.worked_minutes if record else 0,
        status=AttendanceStatus(record.status) if record else None,
    )


@router.post("/check-in", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def check_in(employee: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    try:
        record = svc.check_in(db, employee.id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))
    db.commit()
    db.refresh(record)
    payload = _out(record, employee)
    bus.publish("attendance.checked_in", payload.model_dump(), to_user_ids=[employee.id])
    return payload


@router.post("/check-out", response_model=AttendanceOut)
def check_out(employee: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    try:
        record = svc.check_out(db, employee.id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))
    db.commit()
    db.refresh(record)
    payload = _out(record, employee)
    bus.publish("attendance.checked_out", payload.model_dump(), to_user_ids=[employee.id])
    return payload


@router.get("/me", response_model=AttendanceSummary)
def my_attendance(
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
    start: Optional[date] = None,
    end: Optional[date] = None,
):
    start, end = _resolve_range(start, end)
    return svc.build_summary(svc.records_in_range(db, employee.id, start, end), start, end)


@router.get("/me/week", response_model=AttendanceSummary)
def my_week(
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
    anchor: Optional[date] = None,
):
    start, end = svc.week_bounds(anchor or date.today())
    return svc.build_summary(svc.records_in_range(db, employee.id, start, end), start, end)


@router.get("/employee/{employee_id}", response_model=AttendanceSummary)
def employee_attendance(
    employee_id: int,
    db: Session = Depends(get_db),
    auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account),
    start: Optional[date] = None,
    end: Optional[date] = None,
):
    account_type, account = auth_tuple
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")

    if account_type == "employee" and account.id != employee_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only open your own attendance.")

    start, end = _resolve_range(start, end)
    return svc.build_summary(svc.records_in_range(db, employee_id, start, end), start, end)


@router.get("", response_model=List[AttendanceOut])
def list_attendance(
    db: Session = Depends(get_db),
    _: Any = Depends(get_current_hr_or_corp_admin),
    day: Optional[date] = Query(None, description="Defaults to today"),
    department: Optional[str] = None,
    attendance_status: Optional[AttendanceStatus] = None,
):
    day = day or date.today()
    stmt = (
        select(AttendanceRecord, Employee)
        .join(Employee, Employee.id == AttendanceRecord.employee_id)
        .where(AttendanceRecord.work_date == day)
    )
    if department:
        stmt = stmt.where(Employee.department == department)
    if attendance_status:
        stmt = stmt.where(AttendanceRecord.status == attendance_status.value)
    rows = db.execute(stmt.order_by(Employee.first_name)).all()
    return [_out(record, employee) for record, employee in rows]


@router.put("/record", response_model=AttendanceOut)
def upsert_record(
    payload: AttendanceAdminUpsert,
    db: Session = Depends(get_db),
    _: Any = Depends(get_current_hr_or_corp_admin),
):
    """HR override for a single day (corrections, manual leave marking)."""
    employee = db.get(Employee, payload.employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")

    record = svc.get_record(db, payload.employee_id, payload.work_date)
    if record is None:
        record = AttendanceRecord(employee_id=payload.employee_id, work_date=payload.work_date)
        db.add(record)

    record.check_in = payload.check_in
    record.check_out = payload.check_out
    record.note = payload.note
    if payload.check_in and payload.check_out:
        record.worked_minutes = int((payload.check_out - payload.check_in).total_seconds() // 60)
    elif payload.status in (AttendanceStatus.ABSENT, AttendanceStatus.LEAVE):
        record.worked_minutes = 0
    record.status = payload.status.value

    db.commit()
    db.refresh(record)
    result = _out(record, employee)
    bus.publish("attendance.updated", result.model_dump(), to_user_ids=[employee.id])
    return result
