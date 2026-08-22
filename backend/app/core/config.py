"""Application settings, loaded from environment variables / .env file."""
from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App -------------------------------------------------------------
    APP_NAME: str = "Dayflow HRMS"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:5173"

    # --- Database --------------------------------------------------------
    POSTGRES_USER: str = "dayflow"
    POSTGRES_PASSWORD: str = "dayflow"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "dayflow"

    # --- Security --------------------------------------------------------
    SECRET_KEY: str = "change-me-in-production-please-use-a-long-random-string"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    EMAIL_TOKEN_EXPIRE_HOURS: int = 48
    JWT_ALGORITHM: str = "HS256"

    # --- CORS ------------------------------------------------------------
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"])

    # --- Mail (local-first: messages are written to disk, no cloud SMTP) --
    MAIL_OUTBOX_DIR: str = "var/mail"
    MAIL_FROM: str = "no-reply@dayflow.co"
    AUTO_VERIFY_EMAIL: bool = False  # set true to skip the verification click in dev

    # --- Business rules --------------------------------------------------
    WORKDAY_START: str = "09:00"
    WORKDAY_MINUTES: int = 480          # 8h standard day
    HALF_DAY_MINUTES: int = 240         # below this (but > 0) counts as half-day
    ANNUAL_PAID_LEAVE_DAYS: int = 18
    ANNUAL_SICK_LEAVE_DAYS: int = 10

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
