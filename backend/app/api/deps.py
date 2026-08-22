"""Shared dependencies: DB session, current account, role guards for 3-role architecture."""
from typing import Any, Optional, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.corp_admin import CorpAdmin
from app.models.employee import Employee
from app.models.hr_officer import HROfficer

bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Your session expired. Sign in again.",
    headers={"WWW-Authenticate": "Bearer"},
)

AnyAccount = Union[CorpAdmin, HROfficer, Employee]


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AnyAccount:
    if credentials is None or not credentials.credentials:
        raise CREDENTIALS_ERROR
    try:
        payload = decode_token(credentials.credentials, "access")
        account_id = int(payload["sub"])
        role = payload.get("role", "EMPLOYEE")
    except (JWTError, KeyError, ValueError):
        raise CREDENTIALS_ERROR

    account: Optional[AnyAccount] = None
    if role == "CORPORATE":
        account = db.get(CorpAdmin, account_id)
    elif role in ("HR_ADMIN", "ADMIN"):
        account = db.get(HROfficer, account_id)
    else:
        account = db.get(Employee, account_id)

    if account is None or not account.is_active:
        raise CREDENTIALS_ERROR
    if not account.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Confirm your email address to unlock your account.",
        )
    return account


def get_current_admin(account: AnyAccount = Depends(get_current_user)) -> HROfficer:
    if not isinstance(account, HROfficer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This area is limited to HR administrators.",
        )
    return account


def get_current_corporate(account: AnyAccount = Depends(get_current_user)) -> CorpAdmin:
    if not isinstance(account, CorpAdmin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This area is limited to corporate administrators.",
        )
    return account


def get_current_employee(account: AnyAccount = Depends(get_current_user)) -> Employee:
    if not isinstance(account, Employee):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This area is limited to employee accounts.",
        )
    return account
