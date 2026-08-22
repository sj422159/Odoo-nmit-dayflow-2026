"""Generate a realistic demo dataset: `python -m app.db.seed`.

The schema itself carries no data — this is an explicit, idempotent CLI so the
analytics models have history to train on. Use `--reset` to wipe first.
"""
import argparse
import random
from datetime import date
from decimal import Decimal

from sqlalchemy import delete, select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.attendance import AttendanceRecord
from app.models.corp_admin import CorpAdmin
from app.models.department import Department
from app.models.employee import Employee, EmployeeDocument
from app.models.enums import EmploymentType
from app.models.hr_officer import HROfficer
from app.models.leave import LeaveBalance, LeaveRequest
from app.models.notification import Notification
from app.models.payroll import Payslip, SalaryStructure

random.seed(11)

DEPARTMENTS = {
    "Engineering": ["Backend Engineer", "Frontend Engineer", "QA Analyst", "Platform Engineer"],
    "People Ops": ["HR Officer", "Recruiter", "People Partner"],
    "Finance": ["Payroll Analyst", "Accountant"],
    "Design": ["Product Designer", "UX Researcher"],
    "Sales": ["Account Executive", "Sales Development Rep"],
}

FIRST_NAMES = [
    "Aisha", "Marcus", "Priya", "Tomas", "Leila", "Noah", "Sofia", "Ibrahim", "Hana", "Dmitri",
    "Chloe", "Rahul", "Elena", "Kofi", "Mei", "Jonas", "Amara", "Victor", "Nadia", "Samuel",
    "Yara", "Diego", "Anika", "Felix",
]
LAST_NAMES = [
    "Okafor", "Lindqvist", "Raman", "Duarte", "Haddad", "Berg", "Moretti", "Chowdhury", "Sato",
    "Volkov", "Dubois", "Kapoor", "Petrova", "Mensah", "Zhang", "Weber", "Njoku", "Alvarez",
    "Farouk", "Osei", "Costa", "Bianchi", "Novak", "Keller",
]

PASSWORD_HASH = hash_password("1234")


def wipe(db):
    for model in (Notification, Payslip, SalaryStructure, LeaveBalance, LeaveRequest,
                  AttendanceRecord, EmployeeDocument, Employee, HROfficer, CorpAdmin, Department):
        try:
            db.execute(delete(model))
        except Exception:
            pass
    db.commit()
    print("Cleared existing rows.")


def seed_demo(reset: bool = False):
    db = SessionLocal()
    try:
        if reset:
            wipe(db)

        # 0. Departments
        if not db.scalar(select(Department)):
            dept_codes = {"Engineering": "ENG", "People Ops": "POP", "Finance": "FIN", "Design": "DES", "Sales": "SLS"}
            for name, code in dept_codes.items():
                db.add(Department(name=name, code=code, next_employee_number=1, is_active=True))
            db.commit()

        # 1. Corporate Admin
        if not db.scalar(select(CorpAdmin)):
            corp = CorpAdmin(
                admin_code="CORP-0001",
                email="admin@gmail.com",
                hashed_password=PASSWORD_HASH,
                first_name="Corporate",
                last_name="Admin",
                is_verified=True,
                is_active=True,
            )
            db.add(corp)
            db.flush()

        corp = db.scalar(select(CorpAdmin).order_by(CorpAdmin.id.asc()))

        # 2. HR Admin
        if not db.scalar(select(HROfficer)):
            hr = HROfficer(
                hr_code="HR-1000",
                email="hr@dayflow.co",
                hashed_password=PASSWORD_HASH,
                first_name="Sarah",
                last_name="Jenkins",
                department="Human Resources",
                designation="HR Director",
                created_by_corpadmin_id=corp.id if corp else None,
                is_verified=True,
                is_active=True,
            )
            db.add(hr)
            db.flush()

        hr_admin = db.scalar(select(HROfficer).order_by(HROfficer.id.asc()))

        # 3. Employees
        if not db.scalar(select(Employee)):
            demo_emp = Employee(
                employee_code="DF-1001",
                email="marcus.lindqvist@dayflow.co",
                hashed_password=PASSWORD_HASH,
                first_name="Marcus",
                last_name="Lindqvist",
                department="Engineering",
                designation="Senior Backend Engineer",
                employment_type=EmploymentType.FULL_TIME.value,
                date_of_joining=date(2023, 1, 15),
                hr_id=hr_admin.id if hr_admin else None,
                is_verified=True,
                is_active=True,
            )
            db.add(demo_emp)
            db.flush()

            # Seed 20 additional employees
            for idx in range(2, 22):
                fname = FIRST_NAMES[idx % len(FIRST_NAMES)]
                lname = LAST_NAMES[idx % len(LAST_NAMES)]
                dept = list(DEPARTMENTS.keys())[idx % len(DEPARTMENTS)]
                desig = DEPARTMENTS[dept][idx % len(DEPARTMENTS[dept])]
                emp = Employee(
                    employee_code=f"DF-{1000 + idx:04d}",
                    email=f"{fname.lower()}.{lname.lower()}{idx}@dayflow.co",
                    hashed_password=PASSWORD_HASH,
                    first_name=fname,
                    last_name=lname,
                    department=dept,
                    designation=desig,
                    employment_type=EmploymentType.FULL_TIME.value,
                    date_of_joining=date(2023, (idx % 12) + 1, (idx % 25) + 1),
                    hr_id=hr_admin.id if hr_admin else None,
                    is_verified=True,
                    is_active=True,
                )
                db.add(emp)

            db.commit()

        # Seed salary structures & balances
        employees = list(db.scalars(select(Employee)))
        for emp in employees:
            if not db.scalar(select(LeaveBalance).where(LeaveBalance.employee_id == emp.id)):
                db.add(LeaveBalance(employee_id=emp.id, year=2026, paid_total=18, sick_total=10))
            if not db.scalar(select(SalaryStructure).where(SalaryStructure.employee_id == emp.id)):
                db.add(SalaryStructure(
                    employee_id=emp.id,
                    effective_from=date(2025, 1, 1),
                    currency="INR",
                    basic=Decimal("45000.00"),
                    hra=Decimal("20000.00"),
                    allowances=Decimal("15000.00"),
                    deductions=Decimal("5000.00"),
                ))
        db.commit()
        print("Seed completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    seed_demo(args.reset)
