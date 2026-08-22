from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
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
from app.models.employee import Employee
from app.models.enums import Role
from app.models.user import User
from app.schemas.auth import (
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


def _token_pair(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/signup", response_model=SignUpResponse, status_code=status.HTTP_201_CREATED)
def sign_up(payload: SignUpRequest, db: Session = Depends(get_db)):
    """Register an account. The account stays locked until the email is confirmed."""
    email = payload.email.lower()
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered. Sign in instead.")
    if db.scalar(select(User).where(User.employee_code == payload.employee_code)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That employee ID is already taken.")

    user = User(
        employee_code=payload.employee_code,
        email=email,
        hashed_password=hash_password(payload.password),
        role=payload.role.value,
        is_verified=settings.AUTO_VERIFY_EMAIL,
    )
    db.add(user)
    db.flush()

    employee = Employee(
        user_id=user.id,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        department=payload.department.strip() or "Unassigned",
        designation=payload.designation.strip() or "Associate",
        date_of_joining=date.today(),
    )
    db.add(employee)
    db.flush()
    get_or_create_balance(db, employee.id)
    db.commit()

    link = None
    if not settings.AUTO_VERIFY_EMAIL:
        link = send_verification_email(user.email, employee.full_name, create_email_token(user.id))

    return SignUpResponse(
        message=(
            "Account created. Open the confirmation link to activate it."
            if link
            else "Account created. You can sign in now."
        ),
        verification_link=link if settings.APP_ENV == "development" else None,
    )


@router.post("/verify", response_model=SignUpResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.token, "email_verify")
        user = db.get(User, int(data["sub"]))
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That link is invalid or has expired. Request a new one.")
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No account matches this link.")
    if user.is_verified:
        return SignUpResponse(message="This address was already confirmed. Sign in to continue.")
    user.is_verified = True
    db.commit()
    return SignUpResponse(message="Email confirmed. Sign in to continue.")


@router.post("/resend-verification", response_model=SignUpResponse)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    # Same response either way: do not disclose which addresses exist.
    if user and not user.is_verified:
        employee = db.scalar(select(Employee).where(Employee.user_id == user.id))
        name = employee.full_name if employee else user.employee_code
        link = send_verification_email(user.email, name, create_email_token(user.id))
        return SignUpResponse(
            message="A new confirmation link is on its way.",
            verification_link=link if settings.APP_ENV == "development" else None,
        )
    return SignUpResponse(message="A new confirmation link is on its way.")


@router.post("/login", response_model=TokenPair)
def sign_in(payload: SignInRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is deactivated. Contact HR.")
    if not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Confirm your email address first, then sign in.")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return _token_pair(user)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token, "refresh")
        user = db.get(User, int(data["sub"]))
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session expired. Sign in again.")
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session expired. Sign in again.")
    return _token_pair(user)


@router.get("/me", response_model=SessionOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    employee = db.scalar(select(Employee).where(Employee.user_id == user.id))
    return SessionOut(
        user=UserOut.model_validate(user),
        employee_id=employee.id if employee else None,
        full_name=employee.full_name if employee else user.employee_code,
        department=employee.department if employee else None,
        designation=employee.designation if employee else None,
        avatar_url=employee.avatar_url if employee else None,
    )
