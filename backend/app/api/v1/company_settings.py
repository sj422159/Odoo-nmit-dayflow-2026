from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.company_setting import CompanySettingsOut, CompanySettingsUpdate
from app.services.settings_service import get_company_settings, update_company_settings

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=CompanySettingsOut)
def read_settings(
    db: Session = Depends(get_db),
    account=Depends(get_current_user),
):
    return get_company_settings(db)

@router.put("", response_model=CompanySettingsOut)
def update_settings(
    payload: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    account=Depends(get_current_user),
):
    if account.role not in ["HR_ADMIN", "ADMIN", "CORPORATE"]:
        raise HTTPException(status_code=403, detail="Only HR Officers can update company settings.")
    return update_company_settings(db, payload)
