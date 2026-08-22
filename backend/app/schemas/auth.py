import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.security import validate_password_strength
from app.models.enums import Role

EMPLOYEE_CODE_RE = re.compile(r"^[A-Z]{2,4}-?\d{3,6}$")


class SignUpRequest(BaseModel):
    employee_code: str = Field(..., min_length=4, max_length=24, examples=["DF-1042"])
    email: EmailStr
    password: str = Field(..., min_length=10, max_length=128)
    confirm_password: str
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)
    role: Role = Role.EMPLOYEE
    department: str = Field(default="Unassigned", max_length=80)
    designation: str = Field(default="Associate", max_length=80)

    @field_validator("employee_code")
    @classmethod
    def _code_format(cls, v: str) -> str:
        v = v.strip().upper()
        if not EMPLOYEE_CODE_RE.match(v):
            raise ValueError("ID looks like DF-1042: 2-4 letters, a dash, then 3-6 digits.")
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def _name_format(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[A-Za-z][A-Za-z '\-]*$", v):
            raise ValueError("Use letters, spaces, apostrophes or hyphens only.")
        return v

    @field_validator("password")
    @classmethod
    def _password_policy(cls, v: str) -> str:
        validate_password_strength(v)
        return v

    @field_validator("confirm_password")
    @classmethod
    def _passwords_match(cls, v: str, info):
        if info.data.get("password") and v != info.data["password"]:
            raise ValueError("Both passwords need to match.")
        return v


class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)
    account_type: Optional[Literal["corp_admin", "hr", "employee"]] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    email: EmailStr
    role: Role
    account_type: Literal["corp_admin", "hr", "employee"]
    is_verified: bool
    is_active: bool
    last_login_at: Optional[datetime] = None


class SessionOut(BaseModel):
    user: AccountOut
    employee_id: Optional[int] = None
    full_name: str
    department: Optional[str] = None
    designation: Optional[str] = None
    avatar_url: Optional[str] = None


class SignUpResponse(BaseModel):
    message: str
    verification_link: Optional[str] = None
