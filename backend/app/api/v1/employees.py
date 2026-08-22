import os
import re
from datetime import date
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_authenticated_account,
    get_current_employee,
    get_current_hr_or_corp_admin,
)
from app.core.config import settings
from app.db.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee, EmployeeDocument
from app.models.enums import DocumentType, Role
from app.schemas.employee import (
    DocumentOut,
    EmployeeAdminUpdate,
    EmployeeDetail,
    EmployeeSelfUpdate,
    EmployeeSummary,
    PaginatedEmployees,
    SalaryStructureOut,
)
from app.services.payroll_service import current_structure
from app.services.realtime import bus

router = APIRouter(prefix="/employees", tags=["Employees"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def _summary(employee: Employee, today_status: Optional[str] = None) -> EmployeeSummary:
    return EmployeeSummary(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        email=employee.email,
        department=employee.department,
        designation=employee.designation,
        employment_type=employee.employment_type,
        role=Role.EMPLOYEE,
        is_active=employee.is_active,
        avatar_url=employee.avatar_url,
        today_status=today_status,
    )


def _detail(db: Session, employee: Employee, include_salary: bool) -> EmployeeDetail:
    salary = current_structure(db, employee.id) if include_salary else None
    manager = db.get(Employee, employee.manager_id) if employee.manager_id else None
    return EmployeeDetail(
        **_summary(employee).model_dump(),
        first_name=employee.first_name,
        last_name=employee.last_name,
        phone=employee.phone,
        address=employee.address,
        date_of_joining=employee.date_of_joining,
        manager_name=manager.full_name if manager else None,
        is_verified=employee.is_verified,
        salary=SalaryStructureOut.model_validate(salary) if salary else None,
        documents=[DocumentOut.model_validate(d) for d in employee.documents],
    )


@router.get("/me", response_model=EmployeeDetail)
def read_my_profile(employee: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    return _detail(db, employee, include_salary=True)


@router.patch("/me", response_model=EmployeeDetail)
def update_my_profile(
    payload: EmployeeSelfUpdate,
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Employees may change contact details and their picture only."""
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nothing to save — change a field first.")
    for field, value in data.items():
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    bus.publish(
        "employee.updated",
        {"employee_id": employee.id, "full_name": employee.full_name, "by": "self"},
        to_user_ids=[employee.id],
    )
    return _detail(db, employee, include_salary=True)


# --- EMPLOYEE DOCUMENTS CRUD ---

@router.get("/me/documents", response_model=list[DocumentOut])
def get_my_documents(employee: Employee = Depends(get_current_employee)):
    return [DocumentOut.model_validate(d) for d in employee.documents]


@router.post("/me/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_my_document(
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    """Upload or replace a normalized document slot for the current employee."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unsupported file format '{ext}'. Use .pdf, .jpg, .jpeg, or .png.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "File is too large. Maximum size allowed is 10 MB."
        )

    # Store in local upload folder: uploads/documents/{employee_id}/
    target_dir = os.path.join("var", "uploads", "documents", str(employee.id))
    os.makedirs(target_dir, exist_ok=True)

    safe_type = document_type.value
    filename = f"{safe_type}_{int(date.today().strftime('%Y%m%d'))}{ext}"
    file_path = os.path.join(target_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Check existing slot record
    existing = db.scalar(
        select(EmployeeDocument).where(
            EmployeeDocument.employee_id == employee.id,
            EmployeeDocument.document_type == safe_type,
        )
    )
    if existing:
        existing.file_path = file_path
        existing.original_filename = file.filename or filename
        db.commit()
        db.refresh(existing)
        return DocumentOut.model_validate(existing)

    doc = EmployeeDocument(
        employee_id=employee.id,
        document_type=safe_type,
        file_path=file_path,
        original_filename=file.filename or filename,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.get("/me/documents/{document_type}/download")
def download_my_document(
    document_type: DocumentType,
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    doc = db.scalar(
        select(EmployeeDocument).where(
            EmployeeDocument.employee_id == employee.id,
            EmployeeDocument.document_type == document_type.value,
        )
    )
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document file not found.")

    return FileResponse(
        path=doc.file_path,
        filename=doc.original_filename,
        media_type="application/octet-stream",
    )


@router.delete("/me/documents/{document_type}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_document(
    document_type: DocumentType,
    employee: Employee = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    doc = db.scalar(
        select(EmployeeDocument).where(
            EmployeeDocument.employee_id == employee.id,
            EmployeeDocument.document_type == document_type.value,
        )
    )
    if doc:
        if os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except OSError:
                pass
        db.delete(doc)
        db.commit()
    return None


# --- ADMIN / HR MANAGEMENT ENDPOINTS ---

@router.get("", response_model=PaginatedEmployees)
def list_employees(
    db: Session = Depends(get_db),
    _: Any = Depends(get_current_hr_or_corp_admin),
    search: Optional[str] = Query(None, max_length=80, description="Name, email or employee ID"),
    department: Optional[str] = Query(None, max_length=80),
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = select(Employee)
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Employee.first_name).like(term),
                func.lower(Employee.last_name).like(term),
                func.lower(Employee.email).like(term),
                func.lower(Employee.employee_code).like(term),
            )
        )
    if department:
        stmt = stmt.where(Employee.department == department)
    if is_active is not None:
        stmt = stmt.where(Employee.is_active == is_active)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = list(
        db.scalars(
            stmt.order_by(Employee.first_name, Employee.last_name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )

    today = date.today()
    statuses = {
        eid: status_value
        for eid, status_value in db.execute(
            select(AttendanceRecord.employee_id, AttendanceRecord.status).where(
                AttendanceRecord.work_date == today,
                AttendanceRecord.employee_id.in_([e.id for e in rows] or [0]),
            )
        ).all()
    }

    return PaginatedEmployees(
        items=[_summary(e, statuses.get(e.id)) for e in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(ceil(total / page_size), 1),
    )


@router.get("/departments", response_model=list[str])
def list_departments(db: Session = Depends(get_db), _: Any = Depends(get_current_authenticated_account)):
    return [row[0] for row in db.execute(select(Employee.department).distinct().order_by(Employee.department)).all()]


@router.get("/{employee_id}", response_model=EmployeeDetail)
def read_employee(
    employee_id: int, db: Session = Depends(get_db), _: Any = Depends(get_current_hr_or_corp_admin)
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")
    return _detail(db, employee, include_salary=True)


@router.patch("/{employee_id}", response_model=EmployeeDetail)
def update_employee(
    employee_id: int,
    payload: EmployeeAdminUpdate,
    db: Session = Depends(get_db),
    admin: Any = Depends(get_current_hr_or_corp_admin),
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nothing to save — change a field first.")

    is_active = data.pop("is_active", None)
    manager_id = data.pop("manager_id", "__unset__")
    data.pop("role", None)  # Employees always remain role EMPLOYEE

    if manager_id != "__unset__":
        if manager_id == employee.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "An employee cannot report to themselves.")
        if manager_id is not None and db.get(Employee, manager_id) is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That manager does not exist.")
        employee.manager_id = manager_id

    for field, value in data.items():
        setattr(employee, field, value)

    if is_active is not None:
        employee.is_active = is_active

    db.commit()
    db.refresh(employee)
    bus.publish(
        "employee.updated",
        {"employee_id": employee.id, "full_name": employee.full_name, "by": "admin"},
        to_user_ids=[employee.id],
    )
    return _detail(db, employee, include_salary=True)
