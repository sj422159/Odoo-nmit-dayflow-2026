from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import AnyAccount, get_current_corporate, get_current_user
from app.core.config import settings
from app.core.mailer import send_verification_email
from app.core.security import (
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
from app.models.hr_officer import HROfficer
from app.schemas.auth import (
    AdminCreateRequest,
    RefreshRequest,
    ResendVerificationRequest,
    SessionOut,
    SignInRequest,
    SignUpRequest,
    SignUpResponse,
    TokenPair,
    UserOut,
    VerifyEmailRequest,
)
from app.services.leave_service import get_or_create_balance

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _token_pair_for_account(account_id: int, role: str) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(account_id, role),
        refresh_token=create_refresh_token(account_id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/signup", response_model=SignUpResponse, status_code=status.HTTP_201_CREATED)
def sign_up(payload: SignUpRequest, db: Session = Depends(get_db)):
    """Register an employee account."""
    email = payload.email.lower()
    if (
        db.scalar(select(Employee).where(func.lower(Employee.email) == email))
        or db.scalar(select(HROfficer).where(func.lower(HROfficer.email) == email))
        or db.scalar(select(CorpAdmin).where(func.lower(CorpAdmin.email) == email))
    ):
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered. Sign in instead.")

    # Generate employee code
    count = db.scalar(select(func.count(Employee.id))) or 0
    employee_code = f"DF-{1001 + count}"

    employee = Employee(
        employee_code=employee_code,
        email=email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        department="Unassigned",
        designation="Associate",
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
        link = send_verification_email(employee.email, employee.full_name, create_email_token(employee.id))

    return SignUpResponse(
        message=(
            "Account created. Confirm your email address to sign in."
            if link
            else "Account created successfully. You can now sign in."
        ),
        verification_link=link if settings.APP_ENV == "development" else None,
    )


@router.post("/verify", response_model=SignUpResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.token, "email_verify")
        account_id = int(data["sub"])
        account = db.get(Employee, account_id) or db.get(HROfficer, account_id) or db.get(CorpAdmin, account_id)
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That link is invalid or has expired. Request a new one.")
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account matches this link.")
    if account.is_verified:
        return SignUpResponse(message="This address was already confirmed. Sign in to continue.")
    account.is_verified = True
    db.commit()
    return SignUpResponse(message="Email confirmed. Sign in to continue.")


@router.post("/login", response_model=TokenPair)
def sign_in(payload: SignInRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()

    # 1. Search CorpAdmin
    corp = db.scalar(select(CorpAdmin).where(func.lower(CorpAdmin.email) == email))
    if corp and verify_password(payload.password, corp.hashed_password):
        if not corp.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is deactivated. Contact support.")
        corp.last_login_at = datetime.now(timezone.utc)
        db.commit()
        return _token_pair_for_account(corp.id, "CORPORATE")

    # 2. Search HROfficer
    hr = db.scalar(select(HROfficer).where(func.lower(HROfficer.email) == email))
    if hr and verify_password(payload.password, hr.hashed_password):
        if not hr.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is deactivated. Contact corporate admin.")
        hr.last_login_at = datetime.now(timezone.utc)
        db.commit()
        return _token_pair_for_account(hr.id, "HR_ADMIN")

    # 3. Search Employee
    emp = db.scalar(select(Employee).where(func.lower(Employee.email) == email))
    if emp and verify_password(payload.password, emp.hashed_password):
        if not emp.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is deactivated. Contact HR.")
        emp.last_login_at = datetime.now(timezone.utc)
        db.commit()
        return _token_pair_for_account(emp.id, "EMPLOYEE")

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")


from app.models.department import Department
from app.schemas.auth import (
    AdminCreateRequest,
    CorporateSummaryOut,
    HROfficerOut,
    RefreshRequest,
    ResendVerificationRequest,
    SessionOut,
    SignInRequest,
    SignUpRequest,
    SignUpResponse,
    TokenPair,
    UserOut,
    VerifyEmailRequest,
)

@router.post("/admins", response_model=SignUpResponse, status_code=status.HTTP_201_CREATED)
def create_admin(
    payload: AdminCreateRequest,
    db: Session = Depends(get_db),
    corp_admin: CorpAdmin = Depends(get_current_corporate),
):
    email = payload.email.lower()
    if (
        db.scalar(select(HROfficer).where(func.lower(HROfficer.email) == email))
        or db.scalar(select(Employee).where(func.lower(Employee.email) == email))
    ):
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered.")

    count = db.scalar(select(func.count(HROfficer.id))) or 0
    hr_code = f"HR-{1000 + count}"

    hr = HROfficer(
        hr_code=hr_code,
        email=email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        department="Human Resources",
        designation="HR Officer",
        created_by_corpadmin_id=corp_admin.id,
        is_verified=True,
        is_active=True,
    )
    db.add(hr)
    db.commit()
    return SignUpResponse(message=f"HR admin access created for {email}.")


@router.get("/corporate-summary", response_model=CorporateSummaryOut)
def get_corporate_summary(
    db: Session = Depends(get_db),
    corp_admin: CorpAdmin = Depends(get_current_corporate),
):
    total_employees = db.scalar(select(func.count(Employee.id))) or 0
    total_hr_admins = db.scalar(select(func.count(HROfficer.id))) or 0
    total_departments = db.scalar(select(func.count(Department.id))) or 0
    return CorporateSummaryOut(
        total_employees=total_employees,
        total_hr_admins=total_hr_admins,
        total_departments=total_departments,
    )


@router.get("/hr-admins", response_model=list[HROfficerOut])
def list_hr_admins(
    db: Session = Depends(get_db),
    corp_admin: CorpAdmin = Depends(get_current_corporate),
):
    return list(db.scalars(select(HROfficer).order_by(HROfficer.created_at.desc())))


@router.delete("/hr-admins/{hr_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hr_admin(
    hr_id: int,
    db: Session = Depends(get_db),
    corp_admin: CorpAdmin = Depends(get_current_corporate),
):
    hr = db.get(HROfficer, hr_id)
    if not hr:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "HR admin not found.")
    db.delete(hr)
    db.commit()
    return None



@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token, "refresh")
        account_id = int(data["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session expired. Sign in again.")

    # Check across roles
    account = db.get(CorpAdmin, account_id) or db.get(HROfficer, account_id) or db.get(Employee, account_id)
    if account is None or not account.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session expired. Sign in again.")

    return _token_pair_for_account(account.id, account.role)


@router.get("/me", response_model=SessionOut)
def me(account: AnyAccount = Depends(get_current_user)):
    user_out = UserOut(
        id=account.id,
        employee_code=getattr(account, "employee_code", getattr(account, "hr_code", getattr(account, "admin_code", None))),
        email=account.email,
        role=account.role,
        is_verified=account.is_verified,
        is_active=account.is_active,
        approval_status="APPROVED",
        last_login_at=account.last_login_at,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )
    return SessionOut(
        user=user_out,
        employee_id=account.id if isinstance(account, Employee) else None,
        full_name=account.full_name,
        department=getattr(account, "department", "Corporate"),
        designation=getattr(account, "designation", "Administrator"),
        avatar_url=account.avatar_url,
    )
