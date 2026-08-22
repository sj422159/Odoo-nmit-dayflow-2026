from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

class HolidayBase(BaseModel):
    name: str
    date: date
    day_of_week: Optional[str] = None
    type: str = "PUBLIC"  # PUBLIC, COMPANY, OPTIONAL
    description: Optional[str] = None
    is_active: bool = True

class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[date] = None
    day_of_week: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class HolidayOut(HolidayBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
