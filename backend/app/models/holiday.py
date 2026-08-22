from datetime import date, datetime
from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text
from app.db.base import Base


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(150), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    day_of_week = Column(String(50), nullable=False)
    type = Column(String(50), nullable=False, default="PUBLIC") # PUBLIC, COMPANY, OPTIONAL
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
