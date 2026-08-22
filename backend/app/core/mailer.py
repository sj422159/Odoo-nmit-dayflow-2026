"""Local-first mail transport.

Nothing leaves the machine: every message is written as an .eml file into
MAIL_OUTBOX_DIR and logged, so email verification can be completed offline.
"""
import logging
import re
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger("dayflow.mail")


def _outbox() -> Path:
    path = Path(settings.MAIL_OUTBOX_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def send_mail(to: str, subject: str, body: str) -> Path:
    message = EmailMessage()
    message["From"] = settings.MAIL_FROM
    message["To"] = to
    message["Subject"] = subject
    message["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    message.set_content(body)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    safe_to = re.sub(r"[^a-zA-Z0-9._-]", "_", to)
    target = _outbox() / f"{stamp}-{safe_to}.eml"
    target.write_text(message.as_string(), encoding="utf-8")
    logger.info("Mail written to %s | to=%s | subject=%s", target, to, subject)
    return target


def send_verification_email(to: str, full_name: str, token: str) -> str:
    link = f"{settings.FRONTEND_URL}/verify?token={token}"
    send_mail(
        to,
        "Confirm your Dayflow account",
        (
            f"Hi {full_name},\n\n"
            "Confirm this address to activate your Dayflow account:\n\n"
            f"{link}\n\n"
            f"The link stops working in {settings.EMAIL_TOKEN_EXPIRE_HOURS} hours.\n"
        ),
    )
    logger.info("Verification link for %s -> %s", to, link)
    return link
