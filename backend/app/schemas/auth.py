import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.security import validate_password_strength
from app.models.enums import Role

EMPLOYEE_CODE_RE = re.compile(r"^[A-Z]{2,4}-?\d{3,6}$")


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=10, max_length=128)
    confirm_password: str
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)

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


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: Optional[str] = None
    email: EmailStr
    role: str
    is_verified: bool
    is_active: bool
    last_login_at: Optional[datetime] = None


class SessionOut(BaseModel):
    user: UserOut
    employee_id: Optional[int] = None
    full_name: str
    department: Optional[str] = None
    designation: Optional[str] = None
    avatar_url: Optional[str] = None


class SignUpResponse(BaseModel):
    message: str
    verification_link: Optional[str] = None


class AdminCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=10, max_length=128)
    confirm_password: str
    first_name: str = Field(..., min_length=1, max_length=80)
    last_name: str = Field(..., min_length=1, max_length=80)

    @field_validator("first_name", "last_name")
    @classmethod
    def _admin_name_format(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[A-Za-z][A-Za-z '\-]*$", v):
            raise ValueError("Use letters, spaces, apostrophes or hyphens only.")
        return v

    @field_validator("password")
    @classmethod
    def _admin_password_policy(cls, v: str) -> str:
        validate_password_strength(v)
        return v

    @field_validator("confirm_password")
    @classmethod
    def _admin_passwords_match(cls, v: str, info):
        if info.data.get("password") and v != info.data["password"]:
            raise ValueError("Both passwords need to match.")
        return v


class EmployeeApprovalRequest(BaseModel):
    assignment_scope: str = Field(..., pattern="^(overall|department)$")
    department_id: Optional[int] = Field(default=None, ge=1)
