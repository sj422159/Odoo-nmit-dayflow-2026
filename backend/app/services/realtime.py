"""In-process pub/sub + WebSocket fan-out for CorpAdmin, HR, and Employee roles."""
import asyncio
import json
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket

from app.models.enums import Role

logger = logging.getLogger("dayflow.realtime")


def json_safe(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(v) for v in value]
    return value


class Connection:
    __slots__ = ("websocket", "user_id", "role", "account_type", "employee_id")

    def __init__(
        self,
        websocket: WebSocket,
        user_id: int,
        role: str,
        account_type: str,
        employee_id: Optional[int],
    ):
        self.websocket = websocket
        self.user_id = user_id
        self.role = role
        self.account_type = account_type
        self.employee_id = employee_id


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: Set[Connection] = set()
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        user_id: int,
        role: str,
        account_type: str,
        employee_id: Optional[int],
    ) -> Connection:
        await websocket.accept()
        conn = Connection(websocket, user_id, role, account_type, employee_id)
        async with self._lock:
            self._connections.add(conn)
        logger.info("WS connected id=%s role=%s (%d open)", user_id, role, len(self._connections))
        return conn

    async def disconnect(self, conn: Connection) -> None:
        async with self._lock:
            self._connections.discard(conn)
        logger.info("WS disconnected id=%s (%d open)", conn.user_id, len(self._connections))

    def online_user_ids(self) -> List[int]:
        return sorted({c.user_id for c in self._connections})

    async def send_to(self, conn: Connection, message: Dict[str, Any]) -> bool:
        try:
            await conn.websocket.send_text(json.dumps(json_safe(message)))
            return True
        except Exception:
            await self.disconnect(conn)
            return False

    async def broadcast(
        self,
        message: Dict[str, Any],
        *,
        to_admins: bool = True,
        to_user_ids: Optional[List[int]] = None,
    ) -> None:
        targets = []
        admin_roles = {Role.CORP_ADMIN.value, Role.HR.value}
        for conn in list(self._connections):
            if to_admins and conn.role in admin_roles:
                targets.append(conn)
            elif to_user_ids and conn.user_id in to_user_ids:
                targets.append(conn)
        for conn in targets:
            await self.send_to(conn, message)


manager = ConnectionManager()


class EventBus:
    """Bridges synchronous request handlers to the async WebSocket layer."""

    def __init__(self) -> None:
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def publish(
        self,
        event: str,
        payload: Dict[str, Any],
        *,
        to_admins: bool = True,
        to_user_ids: Optional[List[int]] = None,
    ) -> None:
        message = {
            "event": event,
            "payload": json_safe(payload),
            "emitted_at": datetime.utcnow().isoformat() + "Z",
        }
        coro = manager.broadcast(message, to_admins=to_admins, to_user_ids=to_user_ids)
        loop = self._loop
        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(coro, loop)
        else:
            coro.close()
            logger.debug("Event %s dropped: no running loop", event)


bus = EventBus()
