from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.company_setting import CompanySetting
from app.schemas.company_setting import CompanySettingsOut, CompanySettingsUpdate

DEFAULTS = {
    "WORKDAY_START": settings.WORKDAY_START,
    "WORKDAY_MINUTES": str(settings.WORKDAY_MINUTES),
    "HALF_DAY_MINUTES": str(settings.HALF_DAY_MINUTES),
    "ANNUAL_PAID_LEAVE_DAYS": str(settings.ANNUAL_PAID_LEAVE_DAYS),
    "ANNUAL_SICK_LEAVE_DAYS": str(settings.ANNUAL_SICK_LEAVE_DAYS),
}

def get_setting(db: Session, key: str, default: str = "") -> str:
    default_val = DEFAULTS.get(key, default)
    item = db.query(CompanySetting).filter(CompanySetting.key == key).first()
    if item and item.value:
        return item.value
    return default_val

def set_setting(db: Session, key: str, value: str, description: str = "") -> CompanySetting:
    item = db.query(CompanySetting).filter(CompanySetting.key == key).first()
    if not item:
        item = CompanySetting(key=key, value=value, description=description)
        db.add(item)
    else:
        item.value = value
        if description:
            item.description = description
    db.commit()
    db.refresh(item)
    return item

def get_company_settings(db: Session) -> CompanySettingsOut:
    return CompanySettingsOut(
        workday_start=get_setting(db, "WORKDAY_START", "09:00"),
        workday_minutes=int(get_setting(db, "WORKDAY_MINUTES", "480")),
        half_day_minutes=int(get_setting(db, "HALF_DAY_MINUTES", "240")),
        annual_paid_leave_days=int(get_setting(db, "ANNUAL_PAID_LEAVE_DAYS", "18")),
        annual_sick_leave_days=int(get_setting(db, "ANNUAL_SICK_LEAVE_DAYS", "10")),
    )

def update_company_settings(db: Session, payload: CompanySettingsUpdate) -> CompanySettingsOut:
    set_setting(db, "WORKDAY_START", payload.workday_start, "Workday start time (HH:MM)")
    set_setting(db, "WORKDAY_MINUTES", str(payload.workday_minutes), "Full workday duration in minutes")
    set_setting(db, "HALF_DAY_MINUTES", str(payload.half_day_minutes), "Half day threshold in minutes")
    set_setting(db, "ANNUAL_PAID_LEAVE_DAYS", str(payload.annual_paid_leave_days), "Annual paid leave allowance")
    set_setting(db, "ANNUAL_SICK_LEAVE_DAYS", str(payload.annual_sick_leave_days), "Annual sick leave allowance")
    return get_company_settings(db)
