from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AnyAccount, get_current_admin, get_current_employee, get_current_user
from app.db.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.enums import AttendanceStatus
from app.models.hr_officer import HROfficer
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


def _out(record: AttendanceRecord, employee: Employee) -> AttendanceOut:
    return AttendanceOut(
        id=record.id,
        employee_id=record.employee_id,
        work_date=record.work_date,
        check_in=record.check_in,
        check_out=record.check_out,
        worked_minutes=record.worked_minutes,
        status=record.status,
        note=record.note,
        employee_name=employee.full_name,
        employee_code=employee.employee_code,
    )


@router.post("/check-in", response_model=AttendanceOut)
def check_in(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    try:
        record = svc.check_in(db, employee.id)
    except ValueError as err:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(err))
    bus.publish("attendance.checked_in", {"employee_id": employee.id}, to_user_ids=[employee.id])
    return _out(record, employee)


@router.post("/check-out", response_model=AttendanceOut)
def check_out(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    try:
        record = svc.check_out(db, employee.id)
    except ValueError as err:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(err))
    bus.publish("attendance.checked_out", {"employee_id": employee.id}, to_user_ids=[employee.id])
    return _out(record, employee)


@router.get("/me/today", response_model=TodayStatus)
def read_today(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    record = svc.get_today_record(db, employee.id)
    return TodayStatus(
        work_date=date.today(),
        checked_in=bool(record and record.check_in),
        checked_out=bool(record and record.check_out),
        check_in=record.check_in if record else None,
        check_out=record.check_out if record else None,
        worked_minutes=record.worked_minutes if record else 0,
        status=AttendanceStatus(record.status) if (record and record.status) else None,
    )


@router.get("/me", response_model=AttendanceSummary)
def read_my_attendance(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
    start: Optional[date] = None,
    end: Optional[date] = None,
):
    start, end = _resolve_range(start, end)
    records = svc.records_in_range(db, employee.id, start, end)
    return svc.build_summary(records, start, end)


@router.get("/me/week", response_model=AttendanceSummary)
def read_my_week(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    records = svc.records_in_range(db, employee.id, monday, sunday)
    return svc.build_summary(records, monday, sunday)


@router.get("/employee/{employee_id}", response_model=AttendanceSummary)
def read_employee_attendance(
    employee_id: int,
    db: Session = Depends(get_db),
    account: AnyAccount = Depends(get_current_user),
    start: Optional[date] = None,
    end: Optional[date] = None,
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")
    if account.role not in ("HR_ADMIN", "ADMIN", "CORPORATE") and employee.id != account.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only open your own attendance.")
    start, end = _resolve_range(start, end)
    return svc.build_summary(svc.records_in_range(db, employee_id, start, end), start, end)


@router.get("", response_model=List[AttendanceOut])
def list_attendance(
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
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
    _: HROfficer = Depends(get_current_admin),
):
    employee = db.get(Employee, payload.employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")

    record = svc.get_record(db, payload.employee_id, payload.work_date)
    if record is None:
        record = AttendanceRecord(employee_id=payload.employee_id, work_date=payload.work_date)
        db.add(record)

    record.status = payload.status.value
    record.check_in = payload.check_in
    record.check_out = payload.check_out
    record.worked_minutes = payload.worked_minutes
    record.note = payload.note
    db.commit()
    db.refresh(record)
    bus.publish("attendance.updated", {"employee_id": employee.id}, to_user_ids=[employee.id])
    return _out(record, employee)


def _resolve_range(start: Optional[date], end: Optional[date]) -> tuple[date, date]:
    today = date.today()
    if start and end:
        if end < start:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "End date cannot be before start date.")
        if (end - start).days > MAX_RANGE_DAYS:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Date range cannot exceed {MAX_RANGE_DAYS} days.",
            )
        return start, end
    if start:
        return start, min(today, start + timedelta(days=30))
    if end:
        return end - timedelta(days=30), end
    return today - timedelta(days=30), today
