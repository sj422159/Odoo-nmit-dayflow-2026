from typing import Any, List, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_authenticated_account
from app.db.session import get_db
from app.models.enums import Role
from app.models.notification import Notification
from app.schemas.analytics import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _out(item: Notification) -> NotificationOut:
    return NotificationOut(
        id=item.id,
        category=item.category,
        title=item.title,
        body=item.body,
        link=item.link,
        is_read=item.read_at is not None,
        created_at=item.created_at.isoformat(),
    )


def _recipient_info(auth_tuple: Tuple[str, Any]) -> Tuple[str, int]:
    account_type, account = auth_tuple
    if account_type == "corp_admin":
        return Role.CORP_ADMIN.value, account.id
    elif account_type == "hr":
        return Role.HR.value, account.id
    else:
        return Role.EMPLOYEE.value, account.id


@router.get("", response_model=List[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account),
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
):
    rec_type, rec_id = _recipient_info(auth_tuple)
    stmt = select(Notification).where(
        Notification.recipient_type == rec_type,
        Notification.recipient_id == rec_id,
    )
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    rows = db.scalars(stmt.order_by(Notification.created_at.desc()).limit(limit))
    return [_out(item) for item in rows]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account),
):
    rec_type, rec_id = _recipient_info(auth_tuple)
    count = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.recipient_type == rec_type,
            Notification.recipient_id == rec_id,
            Notification.read_at.is_(None),
        )
    ) or 0
    return {"unread": count}


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account),
):
    rec_type, rec_id = _recipient_info(auth_tuple)
    item = db.get(Notification, notification_id)
    if item is None or item.recipient_type != rec_type or item.recipient_id != rec_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No notification with that ID.")
    if item.read_at is None:
        item.read_at = func.now()
        db.commit()
        db.refresh(item)
    return _out(item)


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    auth_tuple: Tuple[str, Any] = Depends(get_current_authenticated_account),
):
    rec_type, rec_id = _recipient_info(auth_tuple)
    result = db.execute(
        update(Notification)
        .where(
            Notification.recipient_type == rec_type,
            Notification.recipient_id == rec_id,
            Notification.read_at.is_(None),
        )
        .values(read_at=func.now())
    )
    db.commit()
    return {"marked_read": result.rowcount or 0}
