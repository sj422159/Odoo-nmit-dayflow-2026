import csv
import io
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user

from app.db.session import get_db
from app.models.holiday import Holiday
from app.schemas.holiday import HolidayCreate, HolidayOut, HolidayUpdate

router = APIRouter(prefix="/holidays", tags=["holidays"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

@router.get("", response_model=List[HolidayOut])
def list_holidays(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    account=Depends(get_current_user)
,
):
    query = db.query(Holiday).filter(Holiday.is_active == True)
    if year:
        query = query.filter(Holiday.date >= f"{year}-01-01").filter(Holiday.date <= f"{year}-12-31")
    return query.order_by(Holiday.date.asc()).all()

@router.post("", response_model=HolidayOut, status_code=status.HTTP_201_CREATED)
def create_holiday(
    payload: HolidayCreate,
    db: Session = Depends(get_db),
    account=Depends(get_current_user)
,
):
    if account.role not in ["HR_ADMIN", "ADMIN", "CORPORATE"]:
        raise HTTPException(status_code=403, detail="Only HR Officers can add holidays.")
    
    day_name = payload.day_of_week or DAY_NAMES[payload.date.weekday()]
    item = Holiday(
        name=payload.name,
        date=payload.date,
        day_of_week=day_name,
        type=payload.type.upper(),
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{holiday_id}", response_model=HolidayOut)
def update_holiday(
    holiday_id: int,
    payload: HolidayUpdate,
    db: Session = Depends(get_db),
    account=Depends(get_current_user)
,
):
    if account.role not in ["HR_ADMIN", "ADMIN", "CORPORATE"]:
        raise HTTPException(status_code=403, detail="Only HR Officers can update holidays.")
    
    item = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Holiday not found.")
    
    update_data = payload.dict(exclude_unset=True)
    if "date" in update_data and update_data["date"]:
        update_data["day_of_week"] = DAY_NAMES[update_data["date"].weekday()]
        
    for k, v in update_data.items():
        setattr(item, k, v)
        
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    account=Depends(get_current_user)
,
):
    if account.role not in ["HR_ADMIN", "ADMIN", "CORPORATE"]:
        raise HTTPException(status_code=403, detail="Only HR Officers can delete holidays.")
    
    item = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Holiday not found.")
    
    db.delete(item)
    db.commit()

@router.post("/import", response_model=List[HolidayOut])
async def import_holidays(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    account=Depends(get_current_user)
,
):
    if account.role not in ["HR_ADMIN", "ADMIN", "CORPORATE"]:
        raise HTTPException(status_code=403, detail="Only HR Officers can import holidays.")
    
    content = await file.read()
    text = content.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    
    imported = []
    for row in reader:
        name = row.get("Name") or row.get("name") or row.get("Holiday") or row.get("holiday")
        date_str = row.get("Date") or row.get("date")
        h_type = row.get("Type") or row.get("type") or "PUBLIC"
        desc = row.get("Description") or row.get("description") or ""

        if not name or not date_str:
            continue

        try:
            # Parse multiple date formats YYYY-MM-DD, DD/MM/YYYY, etc.
            parsed_date = None
            for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"]:
                try:
                    parsed_date = datetime.strptime(date_str.strip(), fmt).date()
                    break
                except ValueError:
                    pass
            
            if not parsed_date:
                continue

            day_name = DAY_NAMES[parsed_date.weekday()]
            item = Holiday(
                name=name.strip(),
                date=parsed_date,
                day_of_week=day_name,
                type=h_type.strip().upper(),
                description=desc.strip(),
            )
            db.add(item)
            imported.append(item)
        except Exception:
            continue

    db.commit()
    for item in imported:
        db.refresh(item)
    return imported

@router.get("/export")
def export_holidays(
    db: Session = Depends(get_db),
    account=Depends(get_current_user),

):
    items = db.query(Holiday).filter(Holiday.is_active == True).order_by(Holiday.date.asc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Date", "Day of Week", "Type", "Description"])
    for h in items:
        writer.writerow([h.id, h.name, h.date.isoformat(), h.day_of_week, h.type, h.description or ""])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=company_holidays.csv"},
    )
