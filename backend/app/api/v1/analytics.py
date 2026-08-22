from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from math import ceil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import AnyAccount, get_current_admin, get_current_employee, get_current_user
from app.db.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.enums import AttendanceStatus, LeaveStatus
from app.models.hr_officer import HROfficer
from app.models.leave import LeaveRequest
from app.models.payroll import Payslip
from app.schemas.analytics import (
    ActivityEvent,
    AdminOverview,
    AttendanceForecast,
    EmployeeActivityRow,
    EmployeeInsights,
    HeadcountByDepartment,
    IrregularityFlag,
    PaginatedActivityHistory,
    TrendPoint,
)
from app.services import analytics_service as svc
from app.services.realtime import manager

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AdminOverview)
def overview(db: Session = Depends(get_db), _: HROfficer = Depends(get_current_admin)):
    today = date.today()
    start = today - timedelta(days=29)

    total_employees = db.scalar(select(func.count()).select_from(Employee)) or 0
    active_employees = (
        db.scalar(select(func.count()).select_from(Employee).where(Employee.is_active.is_(True))) or 0
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
    _: HROfficer = Depends(get_current_admin),
    days: int = Query(30, ge=7, le=180),
):
    end = date.today()
    start = end - timedelta(days=days - 1)
    return svc.daily_trend(svc.attendance_frame(db, start, end), start, end)


@router.get("/attendance-forecast", response_model=AttendanceForecast)
def attendance_forecast(
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
    horizon: int = Query(7, ge=1, le=14),
):
    """Ridge-regression projection of the org-wide attendance rate."""
    return svc.forecast_attendance(db, horizon=horizon)


@router.get("/irregularities", response_model=List[IrregularityFlag])
def irregularities(
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
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
def live_presence(db: Session = Depends(get_db), _: AnyAccount = Depends(get_current_user)):
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


@router.get("/activity-history", response_model=PaginatedActivityHistory)
def activity_history(
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
    target_date: Optional[date] = Query(None, description="Defaults to today"),
    department: Optional[str] = Query(None, max_length=80),
    search: Optional[str] = Query(None, max_length=80),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    if not isinstance(target_date, date):
        target_date = date.today()
    page = page if isinstance(page, int) else 1
    page_size = page_size if isinstance(page_size, int) else 20
    stmt = select(Employee).where(Employee.is_active.is_(True))
    if department and isinstance(department, str):
        stmt = stmt.where(Employee.department == department)
    if search and isinstance(search, str):
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Employee.first_name).like(term),
                func.lower(Employee.last_name).like(term),
                func.lower(Employee.email).like(term),
                func.lower(Employee.employee_code).like(term),
            )
        )

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(
        db.scalars(
            stmt.order_by(Employee.first_name, Employee.last_name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )

    records = {
        r.employee_id: r
        for r in db.scalars(
            select(AttendanceRecord).where(
                AttendanceRecord.work_date == target_date,
                AttendanceRecord.employee_id.in_([e.id for e in rows] or [0]),
            )
        ).all()
    }

    items = []
    for emp in rows:
        rec = records.get(emp.id)
        count = 0
        if rec:
            if rec.check_in:
                count += 1
            if rec.check_out:
                count += 1
            if rec.note:
                count += 1

        items.append(
            EmployeeActivityRow(
                employee_id=emp.id,
                full_name=emp.full_name,
                employee_code=emp.employee_code,
                email=emp.email,
                department=emp.department,
                designation=emp.designation,
                avatar_url=emp.avatar_url,
                work_date=target_date,
                status=rec.status if rec else None,
                check_in=rec.check_in if rec else None,
                check_out=rec.check_out if rec else None,
                worked_minutes=rec.worked_minutes if rec else 0,
                activity_count=count,
            )
        )

    return PaginatedActivityHistory(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=max(ceil(total / page_size), 1),
    )


@router.get("/activity-history/{employee_id}", response_model=List[ActivityEvent])
def employee_activity_detail(
    employee_id: int,
    db: Session = Depends(get_db),
    account: AnyAccount = Depends(get_current_user),
    target_date: Optional[date] = Query(None),
):
    if not isinstance(target_date, date):
        target_date = date.today()
    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found.")

    if account.role not in ("HR_ADMIN", "ADMIN", "CORPORATE") and account.id != employee_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied.")

    events: List[ActivityEvent] = []

    rec = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.work_date == target_date,
        )
    )
    if rec:
        if rec.check_in:
            events.append(
                ActivityEvent(
                    id=f"checkin-{rec.id}",
                    category="check_in",
                    title="Checked In",
                    description=f"Recorded arrival at {rec.check_in.strftime('%I:%M %p')}",
                    timestamp=rec.check_in,
                    badge_tone="present",
                )
            )
        if rec.check_out:
            events.append(
                ActivityEvent(
                    id=f"checkout-{rec.id}",
                    category="check_out",
                    title="Checked Out",
                    description=f"Completed shift with {round(rec.worked_minutes / 60, 1)} hours worked",
                    timestamp=rec.check_out,
                    badge_tone="present",
                )
            )

    leaves = db.scalars(
        select(LeaveRequest).where(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.start_date <= target_date,
            LeaveRequest.end_date >= target_date,
        )
    ).all()
    for l in leaves:
        ts = l.created_at or datetime.combine(target_date, time(9, 0), tzinfo=timezone.utc)
        events.append(
            ActivityEvent(
                id=f"leave-{l.id}",
                category="leave",
                title=f"{l.leave_type.title()} Leave ({l.status})",
                description=f"Span: {l.start_date} to {l.end_date} ({l.days} days). {l.remarks or ''}",
                timestamp=ts,
                badge_tone="pending" if l.status == "PENDING" else "leave",
            )
        )

    events.sort(key=lambda x: x.timestamp, reverse=True)
    return events


@router.get("/my-today-activities", response_model=List[ActivityEvent])
def my_today_activities(
    account: AnyAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    if isinstance(account, Employee):
        return employee_activity_detail(account.id, db, account, target_date=today)

    events: List[ActivityEvent] = []
    recs = db.scalars(
        select(AttendanceRecord)
        .where(AttendanceRecord.work_date == today)
        .order_by(AttendanceRecord.created_at.desc())
        .limit(20)
    ).all()
    for r in recs:
        emp = db.get(Employee, r.employee_id)
        name = emp.full_name if emp else f"Employee #{r.employee_id}"
        if r.check_in:
            events.append(
                ActivityEvent(
                    id=f"admin-in-{r.id}",
                    category="check_in",
                    title=f"{name} checked in",
                    description=f"{r.work_date:%d %b} at {r.check_in.strftime('%I:%M %p')}",
                    timestamp=r.check_in,
                    badge_tone="present",
                )
            )
        if r.check_out:
            events.append(
                ActivityEvent(
                    id=f"admin-out-{r.id}",
                    category="check_out",
                    title=f"{name} checked out",
                    description=f"{round(r.worked_minutes / 60, 1)} hours worked",
                    timestamp=r.check_out,
                    badge_tone="present",
                )
            )
    events.sort(key=lambda x: x.timestamp, reverse=True)
    return events
