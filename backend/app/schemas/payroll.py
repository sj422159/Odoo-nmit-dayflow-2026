from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.employee import SalaryStructureOut


class SalaryStructureUpdate(BaseModel):
    currency: Literal["INR"] = "INR"
    basic: Decimal = Field(..., ge=0, le=Decimal("9999999.99"))
    hra: Decimal = Field(default=Decimal("0"), ge=0, le=Decimal("9999999.99"))
    allowances: Decimal = Field(default=Decimal("0"), ge=0, le=Decimal("9999999.99"))
    deductions: Decimal = Field(default=Decimal("0"), ge=0, le=Decimal("9999999.99"))
    effective_from: date

    @field_validator("currency")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v


class PayslipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    period_year: int
    period_month: int
    currency: str
    working_days: int
    paid_days: Decimal
    lop_days: Decimal
    gross: Decimal
    deductions: Decimal
    net_pay: Decimal
    generated_at: datetime


class PayrollRunRequest(BaseModel):
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)

    @field_validator("month")
    @classmethod
    def _not_future(cls, v, info):
        year = info.data.get("year")
        if year:
            today = date.today()
            if (year, v) > (today.year, today.month):
                raise ValueError("You cannot run payroll for a future period.")
        return v


class PayrollRunResult(BaseModel):
    year: int
    month: int
    payslips_created: int
    payslips_updated: int
    total_net: Decimal
    currency: str


class MyPayrollOut(BaseModel):
    salary: Optional[SalaryStructureOut] = None
    payslips: List[PayslipOut]
    ytd_net: Decimal
    currency: str
