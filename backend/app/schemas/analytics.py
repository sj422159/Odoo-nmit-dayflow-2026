from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class HeadcountByDepartment(BaseModel):
    department: str
    headcount: int


class TrendPoint(BaseModel):
    work_date: date
    present: int
    absent: int
    half_day: int
    leave: int
    attendance_rate: float


class ForecastPoint(BaseModel):
    work_date: date
    predicted_attendance_rate: float
    lower_bound: float
    upper_bound: float


class AttendanceForecast(BaseModel):
    model: str
    trained_on_days: int
    mean_absolute_error: Optional[float] = None
    points: List[ForecastPoint]
    note: str


class IrregularityFlag(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    department: str
    anomaly_score: float
    absence_rate: float
    avg_late_minutes: float
    leave_days_90d: int
    reason: str


class AdminOverview(BaseModel):
    total_employees: int
    active_employees: int
    present_today: int
    on_leave_today: int
    pending_leave_requests: int
    attendance_rate_30d: float
    monthly_payroll_net: Decimal
    currency: str
    headcount_by_department: List[HeadcountByDepartment]
    trend: List[TrendPoint]


class EmployeeInsights(BaseModel):
    attendance_rate_30d: float
    total_hours_30d: float
    avg_daily_hours: float
    punctuality_score: float
    leave_days_taken_ytd: int
    trend: List[TrendPoint]


class NotificationOut(BaseModel):
    id: int
    category: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: str


class ActivityEvent(BaseModel):
    id: str
    category: str
    title: str
    description: Optional[str] = None
    timestamp: datetime
    badge_tone: Optional[str] = "info"


class EmployeeActivityRow(BaseModel):
    employee_id: int
    full_name: str
    employee_code: Optional[str] = None
    email: str
    department: str
    designation: str
    avatar_url: Optional[str] = None
    work_date: date
    status: Optional[str] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    worked_minutes: int = 0
    activity_count: int = 0


class PaginatedActivityHistory(BaseModel):
    items: List[EmployeeActivityRow]
    total: int
    page: int
    page_size: int
    pages: int


class HeadcountByDepartment(BaseModel):
    department: str
    headcount: int


class TrendPoint(BaseModel):
    work_date: date
    present: int
    absent: int
    half_day: int
    leave: int
    attendance_rate: float


class ForecastPoint(BaseModel):
    work_date: date
    predicted_attendance_rate: float
    lower_bound: float
    upper_bound: float


class AttendanceForecast(BaseModel):
    model: str
    trained_on_days: int
    mean_absolute_error: Optional[float] = None
    points: List[ForecastPoint]
    note: str


class IrregularityFlag(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    department: str
    anomaly_score: float
    absence_rate: float
    avg_late_minutes: float
    leave_days_90d: int
    reason: str


class AdminOverview(BaseModel):
    total_employees: int
    active_employees: int
    present_today: int
    on_leave_today: int
    pending_leave_requests: int
    attendance_rate_30d: float
    monthly_payroll_net: Decimal
    currency: str
    headcount_by_department: List[HeadcountByDepartment]
    trend: List[TrendPoint]


class EmployeeInsights(BaseModel):
    attendance_rate_30d: float
    total_hours_30d: float
    avg_daily_hours: float
    punctuality_score: float
    leave_days_taken_ytd: int
    trend: List[TrendPoint]


class NotificationOut(BaseModel):
    id: int
    category: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: str
