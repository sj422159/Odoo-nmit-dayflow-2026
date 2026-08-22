from fastapi import APIRouter

from app.api.v1 import analytics, attendance, auth, employees, leave, notifications, payroll, ws

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(employees.router)
api_router.include_router(attendance.router)
api_router.include_router(leave.router)
api_router.include_router(payroll.router)
api_router.include_router(analytics.router)
api_router.include_router(notifications.router)
api_router.include_router(ws.router)
