from datetime import date
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import AnyAccount, get_current_admin, get_current_employee, get_current_user
from app.db.session import get_db
from app.models.attendance import AttendanceRecord
from app.models.department import Department
from app.models.employee import Employee
from app.models.hr_officer import HROfficer
from app.schemas.auth import EMPLOYEE_CODE_RE, EmployeeApprovalRequest
from app.schemas.employee import (
    DepartmentCreate,
    DepartmentOut,
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


def _summary(employee: Employee, today_status: Optional[str] = None) -> EmployeeSummary:
    return EmployeeSummary(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        email=employee.email,
        department=employee.department,
        designation=employee.designation,
        employment_type=employee.employment_type,
        role=employee.role,
        is_active=employee.is_active,
        avatar_url=employee.avatar_url,
        today_status=today_status,
    )


def _detail(db: Session, employee: Employee, include_salary: bool) -> EmployeeDetail:
    sal = current_structure(db, employee.id) if include_salary else None
    return EmployeeDetail(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        phone=employee.phone,
        address=employee.address,
        department=employee.department,
        designation=employee.designation,
        employment_type=employee.employment_type,
        date_of_joining=employee.date_of_joining,
        role=employee.role,
        is_active=employee.is_active,
        is_verified=employee.is_verified,
        approval_status="APPROVED",
        avatar_url=employee.avatar_url,
        manager_id=employee.manager_id,
        manager_name=employee.manager.full_name if employee.manager else None,
        salary_structure=SalaryStructureOut.model_validate(sal) if sal else None,
        documents=[
            DocumentOut(
                id=doc.id,
                document_type=doc.document_type,
                file_path=doc.file_path,
                original_filename=doc.original_filename,
                uploaded_at=doc.uploaded_at,
            )
            for doc in employee.documents
        ],
    )


@router.get("/me", response_model=EmployeeDetail)
def read_current_employee_profile(
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    return _detail(db, employee, include_salary=True)


@router.patch("/me", response_model=EmployeeDetail)
def update_current_employee_profile(
    payload: EmployeeSelfUpdate,
    db: Session = Depends(get_db),
    employee: Employee = Depends(get_current_employee),
):
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    bus.publish(
        "employee.updated",
        {"employee_id": employee.id, "full_name": employee.full_name},
        to_user_ids=[employee.id],
    )
    return _detail(db, employee, include_salary=True)


@router.get("", response_model=PaginatedEmployees)
def list_employees(
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
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


@router.get("/pending-access", response_model=PaginatedEmployees)
def list_pending_access(
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
):
    employees = list(
        db.scalars(
            select(Employee)
            .where(Employee.is_verified.is_(False))
            .order_by(Employee.created_at)
        )
    )
    return PaginatedEmployees(
        items=[_summary(employee) for employee in employees],
        total=len(employees),
        page=1,
        page_size=max(len(employees), 1),
        pages=1,
    )


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), _: AnyAccount = Depends(get_current_user)):
    return list(db.scalars(select(Department).where(Department.is_active.is_(True)).order_by(Department.name)))


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
):
    if db.scalar(select(Department).where(or_(Department.name == payload.name, Department.code == payload.code))):
        raise HTTPException(status.HTTP_409_CONFLICT, "That department name or code already exists.")
    department = Department(name=payload.name, code=payload.code)
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@router.get("/{employee_id}", response_model=EmployeeDetail)
def read_employee(
    employee_id: int, db: Session = Depends(get_db), _: HROfficer = Depends(get_current_admin)
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")
    return _detail(db, employee, include_salary=True)


@router.post("/{employee_id}/approve", response_model=EmployeeDetail)
def approve_employee(
    employee_id: int,
    payload: EmployeeApprovalRequest,
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")
    if employee.is_verified:
        raise HTTPException(status.HTTP_409_CONFLICT, "This employee already has access.")
    if payload.assignment_scope == "department":
        if payload.department_id is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a department for this employee.")
        department = db.get(Department, payload.department_id)
        if department is None or not department.is_active:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "That department does not exist.")
        employee.department_id = department.id
        employee.department = department.name
        employee_code = f"{department.code}-{department.next_employee_number:04d}"
        department.next_employee_number += 1
    else:
        employee_code = _next_overall_code(db)
    employee.employee_code = employee_code
    employee.is_verified = True
    employee.is_active = True
    db.commit()
    db.refresh(employee)
    bus.publish("employee.access_approved", {"employee_id": employee.id}, to_user_ids=[employee.id])
    return _detail(db, employee, include_salary=True)


@router.post("/{employee_id}/reject")
def reject_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    _: HROfficer = Depends(get_current_admin),
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")
    employee.is_active = False
    db.commit()
    bus.publish("employee.access_rejected", {"employee_id": employee.id}, to_user_ids=[employee.id])
    return {"message": "Employee access request rejected."}


def _next_overall_code(db: Session) -> str:
    codes = db.scalars(select(Employee.employee_code).where(Employee.employee_code.is_not(None))).all()
    numbers = [int(code.split("-")[-1]) for code in codes if code and EMPLOYEE_CODE_RE.match(code)]
    return f"DF-{max(numbers, default=0) + 1:04d}"


@router.patch("/{employee_id}", response_model=EmployeeDetail)
def update_employee(
    employee_id: int,
    payload: EmployeeAdminUpdate,
    db: Session = Depends(get_db),
    admin: HROfficer = Depends(get_current_admin),
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nothing to save — change a field first.")

    is_active = data.pop("is_active", None)
    manager_id = data.pop("manager_id", "__unset__")

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
