import asyncio
import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine
from app.services.realtime import bus

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Dayflow HRMS API — authentication, employee profiles, attendance, leave, "
        "payroll and analytics. Live updates stream over `/api/v1/ws?token=...`."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    """Turn Pydantic errors into a field->message map the forms can render."""
    fields = {}
    for error in exc.errors():
        location = [str(part) for part in error["loc"] if part not in ("body", "query", "path")]
        key = ".".join(location) or "form"
        message = error["msg"]
        fields.setdefault(key, message.replace("Value error, ", ""))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Some fields need attention.", "fields": fields},
    )


@app.on_event("startup")
async def on_startup():
    bus.bind_loop(asyncio.get_running_loop())
    logging.getLogger("dayflow").info("%s API ready in %s mode", settings.APP_NAME, settings.APP_ENV)


@app.get("/health", tags=["System"])
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database = "up"
    except Exception:
        database = "down"
    return {"status": "ok" if database == "up" else "degraded", "database": database, "version": app.version}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
