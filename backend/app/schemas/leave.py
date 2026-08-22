from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import LeaveStatus, LeaveType

MAX_LEAVE_SPAN_DAYS = 60


class LeaveApplyRequest(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    remarks: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _validate_range(self):
        if self.end_date < self.start_date:
            raise ValueError("The end date cannot be before the start date.")
        span = (self.end_date - self.start_date).days + 1
        if span > MAX_LEAVE_SPAN_DAYS:
            raise ValueError(f"A single request covers at most {MAX_LEAVE_SPAN_DAYS} days.")
        if self.start_date < date.today().replace(day=1):
            raise ValueError("Backdated requests are limited to the current month.")
        return self

    @field_validator("remarks")
    @classmethod
    def _trim(cls, v):
        return v.strip() if v else None


class LeaveDecisionRequest(BaseModel):
    decision: LeaveStatus
    comment: Optional[str] = Field(default=None, max_length=500)

    @field_validator("decision")
    @classmethod
    def _only_approve_or_reject(cls, v: LeaveStatus) -> LeaveStatus:
        if v not in (LeaveStatus.APPROVED, LeaveStatus.REJECTED):
            raise ValueError("Decision must be APPROVED or REJECTED.")
        return v


class LeaveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department: Optional[str] = None
    leave_type: LeaveType
    start_date: date
    end_date: date
    days: int
    remarks: Optional[str] = None
    status: LeaveStatus
    review_comment: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewer_name: Optional[str] = None
    created_at: datetime


class PaginatedLeaves(BaseModel):
    items: List[LeaveOut]
    total: int
    page: int
    page_size: int
    pages: int
    pending_count: int


class LeaveBalanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    year: int
    paid_total: int
    paid_used: int
    paid_remaining: int
    sick_total: int
    sick_used: int
    sick_remaining: int
    unpaid_used: int
    pending_days: int
