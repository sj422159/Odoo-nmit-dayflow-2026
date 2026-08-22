from pydantic import BaseModel, Field

class CompanySettingsOut(BaseModel):
    workday_start: str = Field("09:00", description="Workday start time (HH:MM)")
    workday_minutes: int = Field(480, description="Full workday duration in minutes")
    half_day_minutes: int = Field(240, description="Half day threshold in minutes")
    annual_paid_leave_days: int = Field(18, description="Annual paid leave allowance")
    annual_sick_leave_days: int = Field(10, description="Annual sick leave allowance")

class CompanySettingsUpdate(BaseModel):
    workday_start: str = Field(..., description="Workday start time (HH:MM)")
    workday_minutes: int = Field(..., ge=60, le=1440, description="Full workday duration in minutes")
    half_day_minutes: int = Field(..., ge=30, le=720, description="Half day threshold in minutes")
    annual_paid_leave_days: int = Field(..., ge=0, le=365, description="Annual paid leave allowance")
    annual_sick_leave_days: int = Field(..., ge=0, le=365, description="Annual sick leave allowance")
