from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ChatMessageCreate(BaseModel):
    recipient_type: str = Field(..., description="EMPLOYEE, HR_ADMIN, CORPORATE, ALL, DEPARTMENT")
    recipient_id: Optional[int] = Field(default=None, description="User ID for direct 1-on-1 chats")
    target_department: Optional[str] = Field(default=None, description="Department name for target broadcast")
    message_type: str = Field(default="DIRECT", description="DIRECT or ANNOUNCEMENT")
    content: str = Field(..., min_length=1, max_length=5000, description="Message text content")


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_type: str
    sender_id: int
    sender_name: str
    recipient_type: str
    recipient_id: Optional[int] = None
    target_department: Optional[str] = None
    message_type: str
    content: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class ChatChannelOut(BaseModel):
    id: str  # Unique channel identifier (e.g. "announcements", "emp-34", "hr-5")
    title: str  # Contact full name or "📢 Company Announcements"
    subtitle: Optional[str] = None  # Designation, Department, or "Broadcast Channel"
    avatar_url: Optional[str] = None
    role: str  # EMPLOYEE, HR_ADMIN, CORPORATE, SYSTEM
    contact_id: Optional[int] = None
    contact_type: str  # EMPLOYEE, HR_ADMIN, CORPORATE, ALL
    is_announcement: bool = False
    unread_count: int = 0
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
