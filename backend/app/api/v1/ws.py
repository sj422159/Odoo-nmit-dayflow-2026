"""Live channel. Clients connect to /api/v1/ws?token=<access token>."""
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
from app.models.employee import Employee
from app.models.enums import AttendanceStatus, LeaveStatus, Role
from app.models.leave import LeaveRequest
from app.models.notification import Notification
from app.models.user import User
from app.services.realtime import manager

logger = logging.getLogger("dayflow.ws")
router = APIRouter(tags=["Realtime"])

HEARTBEAT_SECONDS = 20


def _snapshot(user_id: int, role: str, employee_id):
    """A small state pulse so a reconnecting client is instantly consistent."""
    with SessionLocal() as db:
        today = date.today()
        unread = db.scalar(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user_id, Notification.read_at.is_(None)
            )
        ) or 0
        data = {"unread_notifications": unread, "server_time": datetime.now(timezone.utc).isoformat()}

        if role == Role.ADMIN.value:
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
        elif employee_id:
            record = db.scalar(
                select(AttendanceRecord).where(
                    AttendanceRecord.employee_id == employee_id, AttendanceRecord.work_date == today
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
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    with SessionLocal() as db:
        user = db.get(User, user_id)
        if user is None or not user.is_active or not user.is_verified:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Account not available")
            return
        employee = db.scalar(select(Employee).where(Employee.user_id == user.id))
        employee_id = employee.id if employee else None
        role = user.role

    conn = await manager.connect(websocket, user_id, role, employee_id)
    await manager.send_to(conn, {"event": "connected", "payload": _snapshot(user_id, role, employee_id)})

    async def pulse():
        while True:
            await asyncio.sleep(HEARTBEAT_SECONDS)
            ok = await manager.send_to(
                conn, {"event": "snapshot", "payload": _snapshot(user_id, role, employee_id)}
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
                    conn, {"event": "snapshot", "payload": _snapshot(user_id, role, employee_id)}
                )
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("WS error for user %s: %s", user_id, exc)
    finally:
        pulse_task.cancel()
        await manager.disconnect(conn)
