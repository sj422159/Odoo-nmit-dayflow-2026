"""Password hashing, strength policy and JWT helpers."""
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Literal, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TokenType = Literal["access", "refresh", "email_verify"]

PASSWORD_RULES = (
    "Password needs at least 10 characters, one uppercase letter, "
    "one lowercase letter, one number and one symbol."
)


def validate_password_strength(password: str) -> None:
    """Raise ValueError with a fixable message when the policy is not met."""
    problems = []
    if len(password) < 10:
        problems.append("at least 10 characters")
    if not re.search(r"[A-Z]", password):
        problems.append("an uppercase letter")
    if not re.search(r"[a-z]", password):
        problems.append("a lowercase letter")
    if not re.search(r"\d", password):
        problems.append("a number")
    if not re.search(r"[^A-Za-z0-9]", password):
        problems.append("a symbol")
    if len(password) > 128:
        problems.append("no more than 128 characters")
    if problems:
        raise ValueError("Password is missing " + ", ".join(problems) + ".")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except ValueError:
        return False


def _create_token(subject: str, token_type: TokenType, expires: timedelta, extra: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires).timestamp()),
        "jti": uuid.uuid4().hex,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int, role: str) -> str:
    return _create_token(
        str(user_id), "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), {"role": role}
    )


def create_refresh_token(user_id: int) -> str:
    return _create_token(str(user_id), "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def create_email_token(user_id: int) -> str:
    return _create_token(str(user_id), "email_verify", timedelta(hours=settings.EMAIL_TOKEN_EXPIRE_HOURS))


def decode_token(token: str, expected_type: TokenType) -> Dict[str, Any]:
    """Return the payload, or raise JWTError when invalid/expired/wrong type."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("type") != expected_type:
        raise JWTError("Unexpected token type")
    return payload
