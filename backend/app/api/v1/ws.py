"""Live WebSocket channel for CorpAdmin, HR Officers, and Employees."""
import asyncio
import json
import logging
from datetime import date, datetime, timezone

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from sqlalchemy import func, select

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.attendance import AttendanceRecord
from app.models.corp_admin import CorpAdmin
from app.models.employee import Employee
from app.models.enums import AttendanceStatus, LeaveStatus, Role
from app.models.hr_officer import HROfficer
from app.models.leave import LeaveRequest
from app.models.notification import Notification

logger = logging.getLogger("dayflow.ws")
router = APIRouter(tags=["Realtime"])

HEARTBEAT_SECONDS = 20


def _snapshot(account_id: int, role: str, account_type: str, employee_id: int = None):
    """A state pulse so connected clients remain consistent."""
    with SessionLocal() as db:
        today = date.today()
        unread = db.scalar(
            select(func.count()).select_from(Notification).where(
                Notification.recipient_type == role,
                Notification.recipient_id == account_id,
                Notification.read_at.is_(None),
            )
        ) or 0
        data = {"unread_notifications": unread, "server_time": datetime.now(timezone.utc).isoformat()}

        if role in (Role.CORP_ADMIN.value, Role.HR.value):
            data["present_today"] = db.scalar(
                select(func.count()).select_from(AttendanceRecord).where(
                    AttendanceRecord.work_date == today,
                    AttendanceRecord.status.in_([AttendanceStatus.PRESENT.value, AttendanceStatus.HALF_DAY.value]),
                )
            ) or 0
            data["on_leave_today"] = db.scalar(
                select(func.count()).select_from(AttendanceRecord).where(
                    AttendanceRecord.work_date == today,
                    AttendanceRecord.status == AttendanceStatus.LEAVE.value,
                )
            ) or 0
            data["pending_leave_requests"] = db.scalar(
                select(func.count()).select_from(LeaveRequest).where(
                    LeaveRequest.status == LeaveStatus.PENDING.value
                )
            ) or 0
            data["currently_working"] = db.scalar(
                select(func.count()).select_from(AttendanceRecord).where(
                    AttendanceRecord.work_date == today,
                    AttendanceRecord.check_in.is_not(None),
                    AttendanceRecord.check_out.is_(None),
                )
            ) or 0
        elif employee_id or account_type == "employee":
            emp_id = employee_id or account_id
            record = db.scalar(
                select(AttendanceRecord).where(
                    AttendanceRecord.employee_id == emp_id, AttendanceRecord.work_date == today
                )
            )
            data["today"] = {
                "checked_in": bool(record and record.check_in),
                "checked_out": bool(record and record.check_out),
                "worked_minutes": record.worked_minutes if record else 0,
                "status": record.status if record else None,
            }
        return data


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token, "access")
        account_id = int(payload["sub"])
        account_type = payload.get("account_type")
        role = payload.get("role")
    except (JWTError, KeyError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    employee_id = None
    with SessionLocal() as db:
        if account_type == "corp_admin" or role == Role.CORP_ADMIN.value:
            acc = db.get(CorpAdmin, account_id)
            role = Role.CORP_ADMIN.value
            account_type = "corp_admin"
        elif account_type == "hr" or role == Role.HR.value:
            acc = db.get(HROfficer, account_id)
            role = Role.HR.value
            account_type = "hr"
        else:
            acc = db.get(Employee, account_id)
            role = Role.EMPLOYEE.value
            account_type = "employee"
            employee_id = acc.id if acc else None

        if acc is None or not getattr(acc, "is_active", True) or not getattr(acc, "is_verified", True):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Account not available")
            return

    from app.services.realtime import manager
    conn = await manager.connect(websocket, account_id, role, account_type, employee_id)
    await manager.send_to(conn, {"event": "connected", "payload": _snapshot(account_id, role, account_type, employee_id)})

    async def pulse():
        while True:
            await asyncio.sleep(HEARTBEAT_SECONDS)
            ok = await manager.send_to(
                conn, {"event": "snapshot", "payload": _snapshot(account_id, role, account_type, employee_id)}
            )
            if not ok:
                break

    pulse_task = asyncio.create_task(pulse())
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if message.get("action") == "ping":
                await manager.send_to(conn, {"event": "pong", "payload": {}})
            elif message.get("action") == "refresh":
                await manager.send_to(
                    conn, {"event": "snapshot", "payload": _snapshot(account_id, role, account_type, employee_id)}
                )
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("WS error for id %s: %s", account_id, exc)
    finally:
        pulse_task.cancel()
        await manager.disconnect(conn)
