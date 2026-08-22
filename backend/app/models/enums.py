"""Domain enumerations, stored as plain strings with DB-level check constraints."""
from enum import Enum


class StrEnum(str, Enum):
    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.value

    @classmethod
    def values(cls):
        return [member.value for member in cls]


class Role(StrEnum):
    CORP_ADMIN = "CORP_ADMIN"  # Highest organization-level administrator
    HR = "HR"                  # HR officer / People operations
    EMPLOYEE = "EMPLOYEE"      # Standard employee


class DocumentType(StrEnum):
    PAN_CARD = "PAN_CARD"
    BANK_DETAILS = "BANK_DETAILS"
    ADDRESS_PROOF = "ADDRESS_PROOF"
    EXPERIENCE_LETTER = "EXPERIENCE_LETTER"
    AADHAAR_CARD = "AADHAAR_CARD"


class RecipientType(StrEnum):
    CORP_ADMIN = "CORP_ADMIN"
    HR = "HR"
    EMPLOYEE = "EMPLOYEE"


class ReviewerType(StrEnum):
    HR = "HR"
    CORP_ADMIN = "CORP_ADMIN"


class AttendanceStatus(StrEnum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    HALF_DAY = "HALF_DAY"
    LEAVE = "LEAVE"


class LeaveType(StrEnum):
    PAID = "PAID"
    SICK = "SICK"
    UNPAID = "UNPAID"


class LeaveStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class EmploymentType(StrEnum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERN = "INTERN"
