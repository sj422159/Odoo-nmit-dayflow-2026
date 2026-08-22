from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import AnyAccount, get_current_user
from app.db.session import get_db
from app.models.chat import ChatMessage
from app.models.corp_admin import CorpAdmin
from app.models.employee import Employee
from app.models.hr_officer import HROfficer
from app.models.notification import Notification
from app.schemas.chat import ChatChannelOut, ChatMessageCreate, ChatMessageOut
from app.services.realtime import bus

router = APIRouter(prefix="/chat", tags=["Chat"])


def _get_account_type(account: AnyAccount) -> str:
    if isinstance(account, CorpAdmin):
        return "CORPORATE"
    if isinstance(account, HROfficer):
        return "HR_ADMIN"
    return "EMPLOYEE"


@router.get("/channels", response_model=List[ChatChannelOut])
def list_chat_channels(
    db: Session = Depends(get_db),
    account: AnyAccount = Depends(get_current_user),
):
    current_type = _get_account_type(account)
    current_id = account.id

    channels: List[ChatChannelOut] = []

    # 1. Announcements Channel
    announcement_msgs = list(
        db.scalars(
            select(ChatMessage)
            .where(ChatMessage.message_type == "ANNOUNCEMENT")
            .order_by(ChatMessage.created_at.desc())
        )
    )
    last_announcement = announcement_msgs[0] if announcement_msgs else None
    unread_announcements = sum(1 for m in announcement_msgs if not m.is_read and m.sender_id != current_id)

    channels.append(
        ChatChannelOut(
            id="announcements",
            title="📢 Company Announcements",
            subtitle="Official HR notices & broad updates",
            avatar_url=None,
            role="SYSTEM",
            contact_id=None,
            contact_type="ALL",
            is_announcement=True,
            unread_count=unread_announcements,
            last_message=last_announcement.content if last_announcement else "No announcements yet.",
            last_message_at=last_announcement.created_at if last_announcement else None,
        )
    )

    # 2. Contacts (HR Officers, Managers, Employees)
    contacts: List[tuple[str, AnyAccount]] = []

    if current_type in ("HR_ADMIN", "CORPORATE"):
        # HR/Admin sees all employees + other HRs
        employees = list(db.scalars(select(Employee).where(Employee.is_active.is_(True)).order_by(Employee.first_name)))
        hrs = list(db.scalars(select(HROfficer).where(HROfficer.is_active.is_(True), HROfficer.id != current_id)))
        for e in employees:
            contacts.append(("EMPLOYEE", e))
        for h in hrs:
            contacts.append(("HR_ADMIN", h))
    else:
        # Employee sees HR Officers + Manager (if assigned)
        hrs = list(db.scalars(select(HROfficer).where(HROfficer.is_active.is_(True))))
        for h in hrs:
            contacts.append(("HR_ADMIN", h))
        if isinstance(account, Employee) and account.manager:
            if account.manager.id != current_id and not any(c[1].id == account.manager.id for c in contacts):
                contacts.append(("EMPLOYEE", account.manager))

    for c_type, contact in contacts:
        channel_key = f"{c_type.lower()}-{contact.id}"

        # Fetch conversation between current user and contact
        msgs = list(
            db.scalars(
                select(ChatMessage)
                .where(
                    ChatMessage.message_type == "DIRECT",
                    or_(
                        (ChatMessage.sender_type == current_type) & (ChatMessage.sender_id == current_id) & (ChatMessage.recipient_type == c_type) & (ChatMessage.recipient_id == contact.id),
                        (ChatMessage.sender_type == c_type) & (ChatMessage.sender_id == contact.id) & (ChatMessage.recipient_type == current_type) & (ChatMessage.recipient_id == current_id),
                    ),
                )
                .order_by(ChatMessage.created_at.desc())
            )
        )
        last_m = msgs[0] if msgs else None
        unread_c = sum(1 for m in msgs if not m.is_read and m.sender_id == contact.id)

        subtitle = getattr(contact, "designation", "Staff")
        if hasattr(contact, "department") and contact.department:
            subtitle = f"{subtitle} · {contact.department}"

        channels.append(
            ChatChannelOut(
                id=channel_key,
                title=contact.full_name,
                subtitle=subtitle,
                avatar_url=contact.avatar_url,
                role=c_type,
                contact_id=contact.id,
                contact_type=c_type,
                is_announcement=False,
                unread_count=unread_c,
                last_message=last_m.content if last_m else "Tap to start conversation",
                last_message_at=last_m.created_at if last_m else None,
            )
        )

    return channels


@router.get("/messages/{channel_id}", response_model=List[ChatMessageOut])
def get_channel_messages(
    channel_id: str,
    db: Session = Depends(get_db),
    account: AnyAccount = Depends(get_current_user),
):
    current_type = _get_account_type(account)
    current_id = account.id

    if channel_id == "announcements":
        return list(
            db.scalars(
                select(ChatMessage)
                .where(ChatMessage.message_type == "ANNOUNCEMENT")
                .order_by(ChatMessage.created_at.asc())
            )
        )

    try:
        parts = channel_id.split("-")
        c_type = parts[0].upper()
        if c_type == "EMP":
            c_type = "EMPLOYEE"
        elif c_type == "HR":
            c_type = "HR_ADMIN"
        elif c_type == "CORP":
            c_type = "CORPORATE"
        contact_id = int(parts[1])
    except (ValueError, IndexError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid channel ID format.")

    return list(
        db.scalars(
            select(ChatMessage)
            .where(
                ChatMessage.message_type == "DIRECT",
                or_(
                    (ChatMessage.sender_type == current_type) & (ChatMessage.sender_id == current_id) & (ChatMessage.recipient_type == c_type) & (ChatMessage.recipient_id == contact_id),
                    (ChatMessage.sender_type == c_type) & (ChatMessage.sender_id == contact_id) & (ChatMessage.recipient_type == current_type) & (ChatMessage.recipient_id == current_id),
                ),
            )
            .order_by(ChatMessage.created_at.asc())
        )
    )


@router.post("/messages", response_model=ChatMessageOut, status_code=status.HTTP_201_CREATED)
def send_chat_message(
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    account: AnyAccount = Depends(get_current_user),
):
    sender_type = _get_account_type(account)
    sender_id = account.id
    sender_name = account.full_name

    if payload.message_type == "ANNOUNCEMENT" and sender_type not in ("HR_ADMIN", "CORPORATE"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only HR Officers and Admins can broadcast announcements.")

    message = ChatMessage(
        sender_type=sender_type,
        sender_id=sender_id,
        sender_name=sender_name,
        recipient_type=payload.recipient_type,
        recipient_id=payload.recipient_id,
        target_department=payload.target_department,
        message_type=payload.message_type,
        content=payload.content.strip(),
        is_read=False,
    )
    db.add(message)
    db.flush()

    # Create Notifications and Trigger Realtime Events
    if payload.message_type == "ANNOUNCEMENT":
        # Create notification for all employees
        employees = list(db.scalars(select(Employee).where(Employee.is_active.is_(True))))
        target_user_ids = [e.id for e in employees]

        for emp in employees:
            notif = Notification(
                recipient_type="employees",
                recipient_id=emp.id,
                category="announcement",
                title=f"📢 Announcement from {sender_name}",
                body=payload.content[:140],
                link="/chat?channel=announcements",
            )
            db.add(notif)

        db.commit()
        db.refresh(message)

        # Broadcast live event over WebSockets
        bus.publish(
            "chat.announcement",
            {
                "id": message.id,
                "sender_name": sender_name,
                "content": message.content,
                "title": f"📢 Announcement from {sender_name}",
                "link": "/chat?channel=announcements",
            },
            to_admins=True,
            to_user_ids=target_user_ids,
        )
    else:
        # Direct 1-on-1 message notification
        if payload.recipient_id:
            rec_type = "employees" if payload.recipient_type == "EMPLOYEE" else "hr"
            notif = Notification(
                recipient_type=rec_type,
                recipient_id=payload.recipient_id,
                category="message",
                title=f"💬 New message from {sender_name}",
                body=payload.content[:140],
                link=f"/chat?channel={sender_type.lower()[:3]}-{sender_id}",
            )
            db.add(notif)

        db.commit()
        db.refresh(message)

        # Real-time WebSocket push to recipient
        bus.publish(
            "chat.message",
            {
                "id": message.id,
                "sender_id": sender_id,
                "sender_type": sender_type,
                "sender_name": sender_name,
                "recipient_id": payload.recipient_id,
                "recipient_type": payload.recipient_type,
                "content": message.content,
                "title": f"💬 New message from {sender_name}",
                "link": f"/chat?channel={sender_type.lower()[:3]}-{sender_id}",
            },
            to_admins=(payload.recipient_type == "HR_ADMIN"),
            to_user_ids=[payload.recipient_id] if payload.recipient_id else None,
        )

    return message


@router.post("/read/{channel_id}")
def mark_channel_read(
    channel_id: str,
    db: Session = Depends(get_db),
    account: AnyAccount = Depends(get_current_user),
):
    current_type = _get_account_type(account)
    current_id = account.id

    if channel_id == "announcements":
        db.query(ChatMessage).filter(
            ChatMessage.message_type == "ANNOUNCEMENT",
            ChatMessage.sender_id != current_id,
            ChatMessage.is_read.is_(False),
        ).update({"is_read": True, "read_at": datetime.utcnow()})
    else:
        try:
            parts = channel_id.split("-")
            c_type = parts[0].upper()
            if c_type == "EMP":
                c_type = "EMPLOYEE"
            elif c_type == "HR":
                c_type = "HR_ADMIN"
            elif c_type == "CORP":
                c_type = "CORPORATE"
            contact_id = int(parts[1])

            db.query(ChatMessage).filter(
                ChatMessage.message_type == "DIRECT",
                ChatMessage.sender_type == c_type,
                ChatMessage.sender_id == contact_id,
                ChatMessage.recipient_type == current_type,
                ChatMessage.recipient_id == current_id,
                ChatMessage.is_read.is_(False),
            ).update({"is_read": True, "read_at": datetime.utcnow()})
        except (ValueError, IndexError):
            pass

    db.commit()
    return {"status": "ok"}
