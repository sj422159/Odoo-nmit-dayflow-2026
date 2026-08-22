from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import AttendanceStatus


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    work_date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    worked_minutes: int
    status: AttendanceStatus
    note: Optional[str] = None
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None


class AttendanceAdminUpsert(BaseModel):
    employee_id: int
    work_date: date
    status: AttendanceStatus
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    note: Optional[str] = Field(default=None, max_length=255)

    @field_validator("work_date")
    @classmethod
    def _not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("You cannot record attendance for a future date.")
        return v

    @model_validator(mode="after")
    def _times_consistent(self):
        if self.check_in and self.check_out and self.check_out <= self.check_in:
            raise ValueError("Check-out has to be after check-in.")
        return self


class AttendanceDayCell(BaseModel):
    work_date: date
    status: Optional[AttendanceStatus] = None
    worked_minutes: int = 0
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None


class AttendanceSummary(BaseModel):
    range_start: date
    range_end: date
    present: int
    absent: int
    half_day: int
    leave: int
    total_hours: float
    attendance_rate: float
    days: List[AttendanceDayCell]


class TodayStatus(BaseModel):
    work_date: date
    checked_in: bool
    checked_out: bool
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    worked_minutes: int = 0
    status: Optional[AttendanceStatus] = None
