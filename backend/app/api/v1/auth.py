from datetime import date, datetime, timezone
from typing import Any, Optional, Tuple, Union

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_authenticated_account
from app.core.config import settings
from app.core.mailer import send_verification_email
from app.core.security import (
    AccountType,
    create_access_token,
    create_email_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.corp_admin import CorpAdmin
from app.models.employee import Employee
from app.models.enums import Role
from app.models.hr_officer import HROfficer
from app.schemas.auth import (
    AccountOut,
    RefreshRequest,
    ResendVerificationRequest,
    SessionOut,
    SignInRequest,
    SignUpRequest,
    SignUpResponse,
    TokenPair,
    VerifyEmailRequest,
)
from app.services.leave_service import get_or_create_balance

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _generate_token_pair(account_id: int, role: str, account_type: AccountType) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(account_id, role, account_type),
        refresh_token=create_refresh_token(account_id, role, account_type),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/employee/signup", response_model=SignUpResponse, status_code=status.HTTP_201_CREATED)
@router.post("/signup", response_model=SignUpResponse, status_code=status.HTTP_201_CREATED)
def sign_up(payload: SignUpRequest, db: Session = Depends(get_db)):
    """Register an Employee account. Stays locked until email is confirmed."""
    email = payload.email.lower()
    if (
        db.scalar(select(Employee).where(func.lower(Employee.email) == email))
        or db.scalar(select(HROfficer).where(func.lower(HROfficer.email) == email))
        or db.scalar(select(CorpAdmin).where(func.lower(CorpAdmin.email) == email))
    ):
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered. Sign in instead.")

    if db.scalar(select(Employee).where(Employee.employee_code == payload.employee_code)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That employee ID is already taken.")

    employee = Employee(
        employee_code=payload.employee_code,
        email=email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        department=payload.department.strip() or "Unassigned",
        designation=payload.designation.strip() or "Associate",
        date_of_joining=date.today(),
        is_verified=settings.AUTO_VERIFY_EMAIL,
        is_active=True,
    )
    db.add(employee)
    db.flush()
    get_or_create_balance(db, employee.id)
    db.commit()

    link = None
    if not settings.AUTO_VERIFY_EMAIL:
        link = send_verification_email(
            employee.email, employee.full_name, create_email_token(employee.id, "employee")
        )

    return SignUpResponse(
        message=(
            "Account created. Open the confirmation link to activate it."
            if link
            else "Account created. You can sign in now."
        ),
        verification_link=link if settings.APP_ENV == "development" else None,
    )


@router.post("/corp-admin/login", response_model=TokenPair)
def corp_admin_login(payload: SignInRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    admin = db.scalar(select(CorpAdmin).where(func.lower(CorpAdmin.email) == email))
    if admin is None or not verify_password(payload.password, admin.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")
    if not admin.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This CorpAdmin account is deactivated.")
    if not admin.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Confirm your email address first.")
    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return _generate_token_pair(admin.id, Role.CORP_ADMIN.value, "corp_admin")


@router.post("/hr/login", response_model=TokenPair)
def hr_login(payload: SignInRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    hr = db.scalar(select(HROfficer).where(func.lower(HROfficer.email) == email))
    if hr is None or not verify_password(payload.password, hr.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")
    if not hr.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This HR account is deactivated.")
    if not hr.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Confirm your email address first.")
    hr.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return _generate_token_pair(hr.id, Role.HR.value, "hr")


@router.post("/employee/login", response_model=TokenPair)
def employee_login(payload: SignInRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    emp = db.scalar(select(Employee).where(func.lower(Employee.email) == email))
    if emp is None or not verify_password(payload.password, emp.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")
    if not emp.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is deactivated. Contact HR.")
    if not emp.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Confirm your email address first.")
    emp.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return _generate_token_pair(emp.id, Role.EMPLOYEE.value, "employee")


@router.post("/login", response_model=TokenPair)
def sign_in(payload: SignInRequest, db: Session = Depends(get_db)):
    """Unified login dispatcher inspecting employee, HR, or CorpAdmin entities."""
    email = payload.email.lower()
    if payload.account_type == "corp_admin":
        return corp_admin_login(payload, db)
    elif payload.account_type == "hr":
        return hr_login(payload, db)
    elif payload.account_type == "employee":
        return employee_login(payload, db)

    # Dispatch check order: Employee -> HR -> CorpAdmin
    emp = db.scalar(select(Employee).where(func.lower(Employee.email) == email))
    if emp and verify_password(payload.password, emp.hashed_password):
        return employee_login(payload, db)

    hr = db.scalar(select(HROfficer).where(func.lower(HROfficer.email) == email))
    if hr and verify_password(payload.password, hr.hashed_password):
        return hr_login(payload, db)

    admin = db.scalar(select(CorpAdmin).where(func.lower(CorpAdmin.email) == email))
    if admin and verify_password(payload.password, admin.hashed_password):
        return corp_admin_login(payload, db)

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token, "refresh")
        account_id = int(data["sub"])
        account_type = data.get("account_type")
        role_str = data.get("role")
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session expired. Sign in again.")

    if account_type == "corp_admin" or role_str == Role.CORP_ADMIN.value:
        admin = db.get(CorpAdmin, account_id)
        if not admin or not admin.is_active:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session invalid.")
        return _generate_token_pair(admin.id, Role.CORP_ADMIN.value, "corp_admin")
    elif account_type == "hr" or role_str == Role.HR.value:
        hr = db.get(HROfficer, account_id)
        if not hr or not hr.is_active:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session invalid.")
        return _generate_token_pair(hr.id, Role.HR.value, "hr")
    else:
        emp = db.get(Employee, account_id)
        if not emp or not emp.is_active:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session invalid.")
        return _generate_token_pair(emp.id, Role.EMPLOYEE.value, "employee")


@router.post("/verify", response_model=SignUpResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.token, "email_verify")
        account_id = int(data["sub"])
        account_type = data.get("account_type", "employee")
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That link is invalid or has expired.")

    account = None
    if account_type == "corp_admin":
        account = db.get(CorpAdmin, account_id)
    elif account_type == "hr":
        account = db.get(HROfficer, account_id)
    else:
        account = db.get(Employee, account_id)

    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account matches this link.")
    if account.is_verified:
        return SignUpResponse(message="This address was already confirmed. Sign in to continue.")
    account.is_verified = True
    db.commit()
    return SignUpResponse(message="Email confirmed. Sign in to continue.")


@router.post("/resend-verification", response_model=SignUpResponse)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    emp = db.scalar(select(Employee).where(func.lower(Employee.email) == email))
    if emp and not emp.is_verified:
        link = send_verification_email(emp.email, emp.full_name, create_email_token(emp.id, "employee"))
        return SignUpResponse(
            message="A new confirmation link is on its way.",
            verification_link=link if settings.APP_ENV == "development" else None,
        )
    return SignUpResponse(message="A new confirmation link is on its way.")


@router.get("/me", response_model=SessionOut)
def me(auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account), db: Session = Depends(get_db)):
    account_type, account = auth_tuple

    if account_type == "corp_admin":
        account_out = AccountOut(
            id=account.id,
            code=account.admin_code,
            email=account.email,
            role=Role.CORP_ADMIN,
            account_type="corp_admin",
            is_verified=account.is_verified,
            is_active=account.is_active,
            last_login_at=account.last_login_at,
        )
        return SessionOut(
            user=account_out,
            employee_id=None,
            full_name=account.full_name,
            department="Executive",
            designation="Corporate Admin",
            avatar_url=account.avatar_url,
        )
    elif account_type == "hr":
        account_out = AccountOut(
            id=account.id,
            code=account.hr_code,
            email=account.email,
            role=Role.HR,
            account_type="hr",
            is_verified=account.is_verified,
            is_active=account.is_active,
            last_login_at=account.last_login_at,
        )
        return SessionOut(
            user=account_out,
            employee_id=None,
            full_name=account.full_name,
            department=account.department,
            designation=account.designation,
            avatar_url=account.avatar_url,
        )
    else: # Employee
        account_out = AccountOut(
            id=account.id,
            code=account.employee_code,
            email=account.email,
            role=Role.EMPLOYEE,
            account_type="employee",
            is_verified=account.is_verified,
            is_active=account.is_active,
            last_login_at=account.last_login_at,
        )
        return SessionOut(
            user=account_out,
            employee_id=account.id,
            full_name=account.full_name,
            department=account.department,
            designation=account.designation,
            avatar_url=account.avatar_url,
        )
