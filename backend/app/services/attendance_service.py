"""Attendance rules: check-in/out, status derivation, calendars and summaries."""
from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, Iterable, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attendance import AttendanceRecord
from app.models.enums import AttendanceStatus
from app.schemas.attendance import AttendanceDayCell, AttendanceSummary


def is_working_day(day: date) -> bool:
    """Monday-Friday. Weekends are excluded from rates and payroll days."""
    return day.weekday() < 5


def working_days_between(start: date, end: date) -> List[date]:
    days, cursor = [], start
    while cursor <= end:
        if is_working_day(cursor):
            days.append(cursor)
        cursor += timedelta(days=1)
    return days


from app.services.settings_service import get_setting


def workday_start_time(db: Optional[Session] = None) -> time:
    val = get_setting(db, "WORKDAY_START", settings.WORKDAY_START) if db else settings.WORKDAY_START
    hour, minute = (int(part) for part in val.split(":"))
    return time(hour=hour, minute=minute)


def derive_status(worked_minutes: int, db: Optional[Session] = None) -> AttendanceStatus:
    half_day_limit = int(get_setting(db, "HALF_DAY_MINUTES", str(settings.HALF_DAY_MINUTES))) if db else settings.HALF_DAY_MINUTES
    if worked_minutes <= 0:
        return AttendanceStatus.ABSENT
    if worked_minutes < half_day_limit:
        return AttendanceStatus.HALF_DAY
    return AttendanceStatus.PRESENT



def get_record(db: Session, employee_id: int, work_date: date) -> Optional[AttendanceRecord]:
    return db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.work_date == work_date,
        )
    )


def get_today_record(db: Session, employee_id: int) -> Optional[AttendanceRecord]:
    return get_record(db, employee_id, date.today())


def check_in(db: Session, employee_id: int, now: Optional[datetime] = None) -> AttendanceRecord:
    now = now or datetime.now(timezone.utc)
    today = now.date()
    record = get_record(db, employee_id, today)
    if record and record.check_in:
        raise ValueError("You already checked in today.")
    if record and record.status == AttendanceStatus.LEAVE.value:
        raise ValueError("Today is marked as approved leave, so check-in is closed.")
    if record is None:
        record = AttendanceRecord(employee_id=employee_id, work_date=today)
        db.add(record)
    record.check_in = now
    record.status = AttendanceStatus.HALF_DAY.value  # provisional until check-out
    record.worked_minutes = 0
    db.flush()
    return record


def check_out(db: Session, employee_id: int, now: Optional[datetime] = None) -> AttendanceRecord:
    now = now or datetime.now(timezone.utc)
    record = get_record(db, employee_id, now.date())
    if record is None or record.check_in is None:
        raise ValueError("Check in first — there is no open session to close.")
    if record.check_out:
        raise ValueError("You already checked out today.")
    check_in_at = record.check_in
    if check_in_at.tzinfo is None:
        check_in_at = check_in_at.replace(tzinfo=timezone.utc)
    minutes = int((now - check_in_at).total_seconds() // 60)
    if minutes < 0:
        minutes = 0
    record.check_out = now
    record.worked_minutes = minutes
    record.status = derive_status(minutes).value
    db.flush()
    return record


def records_in_range(
    db: Session, employee_id: int, start: date, end: date
) -> List[AttendanceRecord]:
    return list(
        db.scalars(
            select(AttendanceRecord)
            .where(
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.work_date >= start,
                AttendanceRecord.work_date <= end,
            )
            .order_by(AttendanceRecord.work_date)
        )
    )


def build_summary(records: Iterable[AttendanceRecord], start: date, end: date) -> AttendanceSummary:
    by_date: Dict[date, AttendanceRecord] = {r.work_date: r for r in records}
    counts = {status.value: 0 for status in AttendanceStatus}
    total_minutes = 0
    cells: List[AttendanceDayCell] = []

    cursor = start
    while cursor <= end:
        record = by_date.get(cursor)
        if record:
            counts[record.status] = counts.get(record.status, 0) + 1
            total_minutes += record.worked_minutes
            cells.append(
                AttendanceDayCell(
                    work_date=cursor,
                    status=AttendanceStatus(record.status),
                    worked_minutes=record.worked_minutes,
                    check_in=record.check_in,
                    check_out=record.check_out,
                )
            )
        else:
            if is_working_day(cursor) and cursor <= date.today():
                counts[AttendanceStatus.ABSENT.value] += 1
                cells.append(AttendanceDayCell(work_date=cursor, status=AttendanceStatus.ABSENT))
            else:
                cells.append(AttendanceDayCell(work_date=cursor, status=None))
        cursor += timedelta(days=1)

    countable = (
        counts[AttendanceStatus.PRESENT.value]
        + counts[AttendanceStatus.ABSENT.value]
        + counts[AttendanceStatus.HALF_DAY.value]
        + counts[AttendanceStatus.LEAVE.value]
    )
    credited = (
        counts[AttendanceStatus.PRESENT.value]
        + 0.5 * counts[AttendanceStatus.HALF_DAY.value]
    )
    rate = round((credited / countable) * 100, 2) if countable else 0.0

    return AttendanceSummary(
        range_start=start,
        range_end=end,
        present=counts[AttendanceStatus.PRESENT.value],
        absent=counts[AttendanceStatus.ABSENT.value],
        half_day=counts[AttendanceStatus.HALF_DAY.value],
        leave=counts[AttendanceStatus.LEAVE.value],
        total_hours=round(total_minutes / 60, 2),
        attendance_rate=rate,
        days=cells,
    )


def week_bounds(anchor: date) -> Tuple[date, date]:
    start = anchor - timedelta(days=anchor.weekday())
    return start, start + timedelta(days=6)


def mark_leave_days(db: Session, employee_id: int, start: date, end: date, note: str) -> int:
    """Stamp approved leave onto the attendance calendar (working days only)."""
    touched = 0
    for day in working_days_between(start, end):
        record = get_record(db, employee_id, day)
        if record is None:
            record = AttendanceRecord(employee_id=employee_id, work_date=day)
            db.add(record)
        if record.status == AttendanceStatus.PRESENT.value and record.worked_minutes > 0:
            continue  # already worked that day; leave does not overwrite real work
        record.status = AttendanceStatus.LEAVE.value
        record.worked_minutes = 0
        record.note = note
        touched += 1
    db.flush()
    return touched
