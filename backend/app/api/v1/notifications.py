from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import AnyAccount, get_current_user
from app.db.session import get_db
from app.models.corp_admin import CorpAdmin
from app.models.employee import Employee
from app.models.hr_officer import HROfficer
from app.models.notification import Notification
from app.schemas.analytics import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _get_recipient_type(account: AnyAccount) -> str:
    if isinstance(account, CorpAdmin):
        return "corp_admins"
    if isinstance(account, HROfficer):
        return "hr_officers"
    return "employees"


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


@router.get("", response_model=List[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    account: AnyAccount = Depends(get_current_user),
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
):
    rec_type = _get_recipient_type(account)
    stmt = select(Notification).where(
        Notification.recipient_type == rec_type,
        Notification.recipient_id == account.id,
    )
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    rows = db.scalars(stmt.order_by(Notification.created_at.desc()).limit(limit))
    return [_out(item) for item in rows]


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), account: AnyAccount = Depends(get_current_user)):
    rec_type = _get_recipient_type(account)
    count = db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.recipient_type == rec_type,
            Notification.recipient_id == account.id,
            Notification.read_at.is_(None),
        )
    ) or 0
    return {"unread": count}


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: int, db: Session = Depends(get_db), account: AnyAccount = Depends(get_current_user)):
    rec_type = _get_recipient_type(account)
    item = db.get(Notification, notification_id)
    if item is None or item.recipient_type != rec_type or item.recipient_id != account.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No notification with that ID.")
    if item.read_at is None:
        item.read_at = func.now()
        db.commit()
        db.refresh(item)
    return _out(item)


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), account: AnyAccount = Depends(get_current_user)):
    rec_type = _get_recipient_type(account)
    result = db.execute(
        update(Notification)
        .where(
            Notification.recipient_type == rec_type,
            Notification.recipient_id == account.id,
            Notification.read_at.is_(None),
        )
        .values(read_at=func.now())
    )
    db.commit()
    return {"marked_read": result.rowcount or 0}
