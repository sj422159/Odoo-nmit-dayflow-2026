"""Shared dependencies: DB session, current role guards for CorpAdmin, HR, Employee."""
from typing import Any, Optional, Tuple, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.corp_admin import CorpAdmin
from app.models.employee import Employee
from app.models.enums import Role
from app.models.hr_officer import HROfficer

bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Your session expired. Sign in again.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_authenticated_account(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Tuple[str, Union[CorpAdmin, HROfficer, Employee]]:
    """Decodes JWT and retrieves active account from corp_admins, hr_officers, or employees table."""
    if credentials is None or not credentials.credentials:
        raise CREDENTIALS_ERROR
    try:
        payload = decode_token(credentials.credentials, "access")
        account_id = int(payload["sub"])
        account_type = payload.get("account_type")
        role_str = payload.get("role")
    except (JWTError, KeyError, ValueError):
        raise CREDENTIALS_ERROR

    account: Optional[Union[CorpAdmin, HROfficer, Employee]] = None

    if account_type == "corp_admin" or role_str == Role.CORP_ADMIN.value:
        account = db.get(CorpAdmin, account_id)
        resolved_type = "corp_admin"
    elif account_type == "hr" or role_str == Role.HR.value:
        account = db.get(HROfficer, account_id)
        resolved_type = "hr"
    elif account_type == "employee" or role_str == Role.EMPLOYEE.value:
        account = db.get(Employee, account_id)
        resolved_type = "employee"
    else:
        # Fallback query attempt
        account = db.get(Employee, account_id) or db.get(HROfficer, account_id) or db.get(CorpAdmin, account_id)
        if isinstance(account, CorpAdmin):
            resolved_type = "corp_admin"
        elif isinstance(account, HROfficer):
            resolved_type = "hr"
        elif isinstance(account, Employee):
            resolved_type = "employee"
        else:
            raise CREDENTIALS_ERROR

    if account is None or not getattr(account, "is_active", True):
        raise CREDENTIALS_ERROR

    return resolved_type, account


def get_current_corp_admin(
    auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account)
) -> CorpAdmin:
    account_type, account = auth_tuple
    if account_type != "corp_admin" or not isinstance(account, CorpAdmin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This area is limited to Corporate Administrators.",
        )
    return account


def get_current_hr(
    auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account)
) -> HROfficer:
    account_type, account = auth_tuple
    if account_type != "hr" or not isinstance(account, HROfficer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This area is limited to HR Officers.",
        )
    return account


def get_current_employee(
    auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account)
) -> Employee:
    account_type, account = auth_tuple
    if account_type != "employee" or not isinstance(account, Employee):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This area is limited to Employee accounts.",
        )
    return account


def get_current_hr_or_corp_admin(
    auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account)
) -> Union[CorpAdmin, HROfficer]:
    account_type, account = auth_tuple
    if account_type not in ("corp_admin", "hr"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires HR Officer or Corporate Admin authorization.",
        )
    return account  # type: ignore


# Backwards compatibility alias for existing admin endpoints
get_current_admin = get_current_hr_or_corp_admin
