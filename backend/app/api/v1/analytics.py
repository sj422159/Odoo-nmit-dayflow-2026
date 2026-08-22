from datetime import date, timedelta
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_employee, get_current_user
from app.db.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.enums import AttendanceStatus, LeaveStatus
from app.models.leave import LeaveRequest
from app.models.payroll import Payslip
from app.models.user import User
from app.schemas.analytics import (
    AdminOverview,
    AttendanceForecast,
    EmployeeInsights,
    HeadcountByDepartment,
    IrregularityFlag,
    TrendPoint,
)
from app.services import analytics_service as svc
from app.services.realtime import manager

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AdminOverview)
def overview(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    today = date.today()
    start = today - timedelta(days=29)

    total_employees = db.scalar(select(func.count()).select_from(Employee)) or 0
    active_employees = (
        db.scalar(select(func.count()).select_from(Employee).join(Employee.user).where(User.is_active.is_(True))) or 0
    )
    present_today = (
        db.scalar(
            select(func.count()).select_from(AttendanceRecord).where(
                AttendanceRecord.work_date == today,
                AttendanceRecord.status.in_([AttendanceStatus.PRESENT.value, AttendanceStatus.HALF_DAY.value]),
            )
        )
        or 0
    )
    on_leave_today = (
        db.scalar(
            select(func.count()).select_from(AttendanceRecord).where(
                AttendanceRecord.work_date == today,
                AttendanceRecord.status == AttendanceStatus.LEAVE.value,
            )
        )
        or 0
    )
    pending = (
        db.scalar(
            select(func.count()).select_from(LeaveRequest).where(LeaveRequest.status == LeaveStatus.PENDING.value)
        )
        or 0
    )

    frame = svc.attendance_frame(db, start, today)
    trend = svc.daily_trend(frame, start, today)
    rated = [p.attendance_rate for p in trend if p.present + p.absent + p.half_day + p.leave > 0]
    rate_30d = round(sum(rated) / len(rated), 2) if rated else 0.0

    headcount = [
        HeadcountByDepartment(department=dept, headcount=count)
        for dept, count in db.execute(
            select(Employee.department, func.count()).group_by(Employee.department).order_by(func.count().desc())
        ).all()
    ]

    payroll_net = db.scalar(
        select(func.coalesce(func.sum(Payslip.net_pay), 0)).where(
            Payslip.period_year == today.year, Payslip.period_month == today.month
        )
    ) or Decimal("0")
    currency = db.scalar(select(Payslip.currency).limit(1)) or "INR"

    return AdminOverview(
        total_employees=total_employees,
        active_employees=active_employees,
        present_today=present_today,
        on_leave_today=on_leave_today,
        pending_leave_requests=pending,
        attendance_rate_30d=rate_30d,
        monthly_payroll_net=Decimal(payroll_net),
        currency=currency,
        headcount_by_department=headcount,
        trend=trend,
    )


@router.get("/attendance-trend", response_model=List[TrendPoint])
def attendance_trend(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    days: int = Query(30, ge=7, le=180),
):
    end = date.today()
    start = end - timedelta(days=days - 1)
    return svc.daily_trend(svc.attendance_frame(db, start, end), start, end)


@router.get("/attendance-forecast", response_model=AttendanceForecast)
def attendance_forecast(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    horizon: int = Query(7, ge=1, le=14),
):
    """Ridge-regression projection of the org-wide attendance rate."""
    return svc.forecast_attendance(db, horizon=horizon)


@router.get("/irregularities", response_model=List[IrregularityFlag])
def irregularities(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    window_days: int = Query(90, ge=30, le=365),
):
    """IsolationForest flags for attendance patterns worth a conversation."""
    return svc.irregularity_flags(db, window_days=window_days)


@router.get("/me", response_model=EmployeeInsights)
def my_insights(
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=7, le=180),
):
    end = date.today()
    start = end - timedelta(days=days - 1)
    frame = svc.attendance_frame(db, start, end, employee_id=employee.id)
    trend = svc.daily_trend(frame, start, end)

    if frame.empty:
        return EmployeeInsights(
            attendance_rate_30d=0.0, total_hours_30d=0.0, avg_daily_hours=0.0,
            punctuality_score=0.0, leave_days_taken_ytd=0, trend=trend,
        )

    present = int((frame["status"] == AttendanceStatus.PRESENT.value).sum())
    half = int((frame["status"] == AttendanceStatus.HALF_DAY.value).sum())
    countable = len(frame)
    rate = round(((present + 0.5 * half) / countable) * 100, 2) if countable else 0.0
    total_minutes = int(frame["worked_minutes"].sum())
    worked_days = int((frame["worked_minutes"] > 0).sum())

    leave_ytd = db.scalar(
        select(func.coalesce(func.sum(LeaveRequest.days), 0)).where(
            LeaveRequest.employee_id == employee.id,
            LeaveRequest.status == LeaveStatus.APPROVED.value,
            LeaveRequest.start_date >= date(end.year, 1, 1),
        )
    ) or 0

    return EmployeeInsights(
        attendance_rate_30d=rate,
        total_hours_30d=round(total_minutes / 60, 2),
        avg_daily_hours=round(total_minutes / 60 / worked_days, 2) if worked_days else 0.0,
        punctuality_score=svc.punctuality_score(frame),
        leave_days_taken_ytd=int(leave_ytd),
        trend=trend,
    )


@router.get("/live-presence")
def live_presence(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Who is currently checked in — polled as a fallback when the socket is down."""
    today = date.today()
    rows = db.execute(
        select(Employee.id, Employee.first_name, Employee.last_name, Employee.department, AttendanceRecord.check_in)
        .join(AttendanceRecord, AttendanceRecord.employee_id == Employee.id)
        .where(
            AttendanceRecord.work_date == today,
            AttendanceRecord.check_in.is_not(None),
            AttendanceRecord.check_out.is_(None),
        )
        .order_by(AttendanceRecord.check_in)
    ).all()
    return {
        "as_of": date.today().isoformat(),
        "sockets_open": len(manager.online_user_ids()),
        "currently_working": [
            {
                "employee_id": eid,
                "full_name": f"{first} {last}",
                "department": dept,
                "since": check_in.isoformat() if check_in else None,
            }
            for eid, first, last, dept, check_in in rows
        ],
    }
