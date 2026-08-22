import re
from datetime import date
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import EmploymentType, Role

PHONE_RE = re.compile(r"^\+?[0-9][0-9 \-]{6,19}$")


def _clean_phone(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return None
    v = v.strip()
    if not PHONE_RE.match(v):
        raise ValueError("Phone number needs 7-20 digits, optionally starting with +.")
    return v


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    file_url: str


class SalaryStructureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    currency: str
    basic: Decimal
    hra: Decimal
    allowances: Decimal
    deductions: Decimal
    effective_from: date
    gross_monthly: Decimal
    net_monthly: Decimal


class EmployeeSummary(BaseModel):
    id: int
    employee_code: str
    full_name: str
    email: EmailStr
    department: str
    designation: str
    employment_type: EmploymentType
    role: Role
    is_active: bool
    avatar_url: Optional[str] = None
    today_status: Optional[str] = None


class EmployeeDetail(EmployeeSummary):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_joining: date
    manager_name: Optional[str] = None
    is_verified: bool
    salary: Optional[SalaryStructureOut] = None
    documents: List[DocumentOut] = Field(default_factory=list)


class EmployeeSelfUpdate(BaseModel):
    """Fields an employee is allowed to change on their own record."""

    phone: Optional[str] = Field(default=None, max_length=24)
    address: Optional[str] = Field(default=None, max_length=500)
    avatar_url: Optional[str] = Field(default=None, max_length=512)

    _validate_phone = field_validator("phone")(_clean_phone)

    @field_validator("avatar_url")
    @classmethod
    def _avatar(cls, v):
        if v in (None, ""):
            return None
        if not re.match(r"^(https?://|/|data:image/)", v):
            raise ValueError("Picture must be a URL or an uploaded image.")
        return v


class EmployeeAdminUpdate(EmployeeSelfUpdate):
    """Admins may edit the full record."""

    first_name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    department: Optional[str] = Field(default=None, min_length=2, max_length=80)
    designation: Optional[str] = Field(default=None, min_length=2, max_length=80)
    employment_type: Optional[EmploymentType] = None
    date_of_joining: Optional[date] = None
    manager_id: Optional[int] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None

    @field_validator("date_of_joining")
    @classmethod
    def _not_future(cls, v):
        if v and v > date.today():
            raise ValueError("Joining date cannot be in the future.")
        return v


class PaginatedEmployees(BaseModel):
    items: List[EmployeeSummary]
    total: int
    page: int
    page_size: int
    pages: int
