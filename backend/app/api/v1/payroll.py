from datetime import date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_employee, get_current_user
from app.db.session import get_db
from app.models.employee import Employee
from app.models.notification import Notification
from app.models.payroll import Payslip, SalaryStructure
from app.models.user import User
from app.schemas.employee import SalaryStructureOut
from app.schemas.payroll import (
    MyPayrollOut,
    PayrollRunRequest,
    PayrollRunResult,
    PayslipOut,
    SalaryStructureUpdate,
)
from app.services import payroll_service as svc
from app.services.realtime import bus

router = APIRouter(prefix="/payroll", tags=["Payroll"])


def _payslip_out(slip: Payslip, employee: Optional[Employee] = None) -> PayslipOut:
    payload = PayslipOut.model_validate(slip)
    employee = employee or slip.employee
    if employee is not None:
        payload.employee_name = employee.full_name
        payload.employee_code = employee.user.employee_code
    return payload


@router.get("/me", response_model=MyPayrollOut)
def my_payroll(employee: Employee = Depends(get_current_employee), db: Session = Depends(get_db)):
    """Read-only salary view for employees."""
    structure = svc.current_structure(db, employee.id)
    slips = list(
        db.scalars(
            select(Payslip)
            .where(Payslip.employee_id == employee.id)
            .order_by(Payslip.period_year.desc(), Payslip.period_month.desc())
            .limit(24)
        )
    )
    year = date.today().year
    ytd = sum((s.net_pay for s in slips if s.period_year == year), Decimal("0.00"))
    return MyPayrollOut(
        salary=SalaryStructureOut.model_validate(structure) if structure else None,
        payslips=[_payslip_out(s, employee) for s in slips],
        ytd_net=svc.money(ytd),
        currency=structure.currency if structure else "USD",
    )


@router.get("/payslips", response_model=List[PayslipOut])
def list_payslips(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
    year: int = Query(default_factory=lambda: date.today().year, ge=2000, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
):
    stmt = (
        select(Payslip, Employee)
        .join(Employee, Employee.id == Payslip.employee_id)
        .where(Payslip.period_year == year)
    )
    if month:
        stmt = stmt.where(Payslip.period_month == month)
    rows = db.execute(stmt.order_by(Payslip.period_month.desc(), Employee.first_name)).all()
    return [_payslip_out(slip, employee) for slip, employee in rows]


@router.get("/structures", response_model=List[dict])
def list_structures(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    employees = list(db.scalars(select(Employee).join(Employee.user)))
    out = []
    for employee in employees:
        structure = svc.current_structure(db, employee.id)
        out.append(
            {
                "employee_id": employee.id,
                "employee_code": employee.user.employee_code,
                "full_name": employee.full_name,
                "department": employee.department,
                "designation": employee.designation,
                "salary": SalaryStructureOut.model_validate(structure).model_dump(mode="json")
                if structure
                else None,
            }
        )
    return out


@router.put("/{employee_id}/salary-structure", response_model=SalaryStructureOut)
def upsert_salary_structure(
    employee_id: int,
    payload: SalaryStructureUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No employee with that ID.")

    structure = db.scalar(
        select(SalaryStructure).where(
            SalaryStructure.employee_id == employee_id,
            SalaryStructure.effective_from == payload.effective_from,
        )
    )
    if structure is None:
        structure = SalaryStructure(employee_id=employee_id, effective_from=payload.effective_from)
        db.add(structure)

    structure.currency = payload.currency
    structure.basic = payload.basic
    structure.hra = payload.hra
    structure.allowances = payload.allowances
    structure.deductions = payload.deductions

    db.add(
        Notification(
            user_id=employee.user_id,
            category="payroll",
            title="Your salary structure was updated",
            body=f"Effective {payload.effective_from:%d %b %Y}.",
            link="/payroll",
        )
    )
    db.commit()
    db.refresh(structure)

    result = SalaryStructureOut.model_validate(structure)
    bus.publish(
        "payroll.structure_updated",
        {"employee_id": employee_id, "full_name": employee.full_name, **result.model_dump()},
        to_user_ids=[employee.user_id],
    )
    return result


@router.post("/run", response_model=PayrollRunResult)
def run_payroll(
    payload: PayrollRunRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Recompute payslips for a period from recorded attendance."""
    created, updated, total_net, currency = svc.run_payroll(db, payload.year, payload.month)
    if created == 0 and updated == 0:
        db.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No salary structures are in effect for that period. Set one first.",
        )
    db.commit()
    result = PayrollRunResult(
        year=payload.year, month=payload.month, payslips_created=created,
        payslips_updated=updated, total_net=total_net, currency=currency,
    )
    bus.publish("payroll.run_completed", result.model_dump())
    return result
