"""Generate a realistic demo dataset: `python -m app.db.seed`.

Seed 1 CorpAdmin, 2 HR Officers, and 16 Employees directly into their role tables.
"""
import argparse
import random
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.attendance import AttendanceRecord
from app.models.corp_admin import CorpAdmin
from app.models.employee import Employee, EmployeeDocument
from app.models.enums import AttendanceStatus, DocumentType, EmploymentType, LeaveStatus, LeaveType, RecipientType, ReviewerType
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

PASSWORD = "Dayflow#2026"


def wipe(db):
    for model in (Notification, Payslip, SalaryStructure, LeaveBalance, LeaveRequest,
                  AttendanceRecord, EmployeeDocument, Employee, HROfficer, CorpAdmin):
        db.execute(delete(model))
    db.commit()
    print("Cleared existing rows.")


def seed_attendance(db, employee: Employee, days: int):
    """Each person gets a stable behaviour profile so the ML models see signal."""
    reliability = random.uniform(0.80, 0.99)
    punctuality = random.gauss(6, 9)
    today = date.today()
    for offset in range(days, -1, -1):
        day = today - timedelta(days=offset)
        if day.weekday() >= 5 or day < employee.date_of_joining:
            continue
        roll = random.random()
        if roll > reliability + 0.06:
            db.add(AttendanceRecord(employee_id=employee.id, work_date=day,
                                    status=AttendanceStatus.ABSENT.value, worked_minutes=0))
            continue
        late = max(0, int(random.gauss(punctuality, 12)))
        start_dt = datetime.combine(day, time(9, 0), tzinfo=timezone.utc) + timedelta(minutes=late)
        if roll > reliability:
            minutes = random.randint(150, 235)
            status = AttendanceStatus.HALF_DAY.value
        else:
            minutes = int(random.gauss(settings.WORKDAY_MINUTES + 15, 35))
            minutes = max(minutes, settings.HALF_DAY_MINUTES + 10)
            status = AttendanceStatus.PRESENT.value
        end_dt = start_dt + timedelta(minutes=minutes)
        if day == today and datetime.now(timezone.utc).hour < 17:
            db.add(AttendanceRecord(employee_id=employee.id, work_date=day, check_in=start_dt,
                                    status=AttendanceStatus.HALF_DAY.value, worked_minutes=0))
            continue
        db.add(AttendanceRecord(employee_id=employee.id, work_date=day, check_in=start_dt,
                                check_out=end_dt, worked_minutes=minutes, status=status))


def seed_leaves(db, employee: Employee, hr_id: int):
    today = date.today()
    for _ in range(random.randint(0, 3)):
        start = today - timedelta(days=random.randint(5, 80))
        while start.weekday() >= 5:
            start += timedelta(days=1)
        span = random.randint(0, 3)
        end = start + timedelta(days=span)
        days = len([d for d in (start + timedelta(n) for n in range((end - start).days + 1)) if d.weekday() < 5])
        if days == 0:
            continue
        leave_type = random.choice([LeaveType.PAID, LeaveType.SICK, LeaveType.UNPAID])
        request = LeaveRequest(
            employee_id=employee.id,
            leave_type=leave_type.value,
            start_date=start,
            end_date=end,
            days=days,
            remarks=random.choice(["Family event", "Medical appointment", "Travelling", "Personal matter"]),
            status=LeaveStatus.APPROVED.value,
            reviewer_type=ReviewerType.HR.value,
            reviewer_id=hr_id,
            review_comment="Approved — enjoy the time off.",
            reviewed_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10)),
        )
        db.add(request)
        db.flush()
        balance = db.scalar(
            select(LeaveBalance).where(LeaveBalance.employee_id == employee.id, LeaveBalance.year == start.year)
        )
        if balance:
            if leave_type == LeaveType.PAID:
                balance.paid_used += days
            elif leave_type == LeaveType.SICK:
                balance.sick_used += days
            else:
                balance.unpaid_used += days
        for day in (start + timedelta(n) for n in range((end - start).days + 1)):
            if day.weekday() >= 5:
                continue
            record = db.scalar(
                select(AttendanceRecord).where(
                    AttendanceRecord.employee_id == employee.id, AttendanceRecord.work_date == day
                )
            )
            if record is None:
                record = AttendanceRecord(employee_id=employee.id, work_date=day)
                db.add(record)
            record.status = AttendanceStatus.LEAVE.value
            record.worked_minutes = 0
            record.check_in = record.check_out = None
            record.note = f"{leave_type.value.title()} leave"


def main(reset: bool, employee_count: int, history_days: int):
    db = SessionLocal()
    try:
        if reset:
            wipe(db)
        if db.scalar(select(CorpAdmin).limit(1)):
            print("Database already has CorpAdmin records. Re-run with --reset to rebuild.")
            return

        # 1. Create CorpAdmin
        corp_admin = CorpAdmin(
            admin_code="CA-1000",
            email="admin@dayflow.co",
            hashed_password=hash_password(PASSWORD),
            first_name="Victor",
            last_name="Alvarez",
            phone="+1 555 0100 001",
            is_verified=True,
            is_active=True,
        )
        db.add(corp_admin)
        db.flush()

        # 2. Create HR Officers
        hr1 = HROfficer(
            hr_code="HR-1001",
            email="hr1@dayflow.co",
            hashed_password=hash_password(PASSWORD),
            first_name="Amara",
            last_name="Njoku",
            phone="+1 555 0100 002",
            department="People Ops",
            designation="Senior HR Manager",
            created_by_corpadmin_id=corp_admin.id,
            is_verified=True,
            is_active=True,
        )
        hr2 = HROfficer(
            hr_code="HR-1002",
            email="hr2@dayflow.co",
            hashed_password=hash_password(PASSWORD),
            first_name="Marcus",
            last_name="Lindqvist",
            phone="+1 555 0100 003",
            department="People Ops",
            designation="HR Officer",
            created_by_corpadmin_id=corp_admin.id,
            is_verified=True,
            is_active=True,
        )
        db.add_all([hr1, hr2])
        db.flush()

        # 3. Create Employees
        employees = []
        used = set()
        for index in range(employee_count):
            while True:
                first, last = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
                if (first, last) not in used:
                    used.add((first, last))
                    break
            dept = random.choice(list(DEPARTMENTS))
            title = random.choice(DEPARTMENTS[dept])
            code = f"DF-{1001 + index}"
            email = f"{first.lower()}.{last.lower()}@dayflow.co"
            joined_on = date.today() - timedelta(days=random.randint(90, 1500))

            emp = Employee(
                employee_code=code,
                email=email,
                hashed_password=hash_password(PASSWORD),
                first_name=first,
                last_name=last,
                phone=f"+1 555 0{random.randint(100, 999)} {random.randint(100, 999)}",
                address=f"{random.randint(10, 900)} Alder Street, Springfield",
                department=dept,
                designation=title,
                employment_type=random.choice(
                    [EmploymentType.FULL_TIME.value] * 5 + [EmploymentType.CONTRACT.value, EmploymentType.PART_TIME.value]
                ),
                date_of_joining=joined_on,
                hr_id=hr1.id if index % 2 == 0 else hr2.id,
                is_verified=True,
                is_active=True,
            )
            db.add(emp)
            db.flush()

            base = Decimal(random.randrange(3200, 8800, 100))
            db.add(SalaryStructure(
                employee_id=emp.id, basic=base,
                hra=(base * Decimal("0.22")).quantize(Decimal("0.01")),
                allowances=Decimal(random.randrange(200, 900, 50)),
                deductions=(base * Decimal("0.11")).quantize(Decimal("0.01")),
                effective_from=max(joined_on, date.today() - timedelta(days=365)),
                currency="USD",
            ))
            db.add(LeaveBalance(employee_id=emp.id, year=date.today().year,
                                paid_total=settings.ANNUAL_PAID_LEAVE_DAYS,
                                sick_total=settings.ANNUAL_SICK_LEAVE_DAYS))

            # Add normalized documents
            db.add(EmployeeDocument(
                employee_id=emp.id,
                document_type=DocumentType.PAN_CARD.value,
                file_path=f"var/uploads/documents/{emp.id}/pan_card.pdf",
                original_filename="pan_card.pdf",
            ))
            db.add(EmployeeDocument(
                employee_id=emp.id,
                document_type=DocumentType.BANK_DETAILS.value,
                file_path=f"var/uploads/documents/{emp.id}/bank_details.pdf",
                original_filename="bank_passbook.pdf",
            ))
            employees.append(emp)

        db.flush()

        for employee in employees:
            seed_attendance(db, employee, history_days)
        db.flush()

        for employee in employees:
            seed_leaves(db, employee, hr1.id)
        db.commit()

        today = date.today()
        for back in (2, 1, 0):
            month = today.month - back
            year = today.year
            while month < 1:
                month += 12
                year -= 1
            created, updated, total, currency = run_payroll(db, year, month)
            print(f"Payroll {year}-{month:02d}: {created} created, {updated} updated, {currency} {total} net")
        db.commit()

        db.add(Notification(
            recipient_type=RecipientType.CORP_ADMIN.value,
            recipient_id=corp_admin.id,
            category="system",
            title="Welcome to Dayflow",
            body="Demo dataset loaded cleanly with 3 separate authentication tables.",
            link="/admin/analytics",
        ))
        db.add(Notification(
            recipient_type=RecipientType.HR.value,
            recipient_id=hr1.id,
            category="system",
            title="HR Dashboard Ready",
            body="Employees and attendance records loaded for HR operations.",
            link="/admin/employees",
        ))
        db.commit()

        print("\nSeed complete.")
        print(f"  CorpAdmin : admin@dayflow.co / {PASSWORD}")
        print(f"  HR Officer: hr1@dayflow.co / {PASSWORD}")
        print(f"  Employee  : {employees[0].email} / {PASSWORD}")
        print(f"  {len(employees)} employees, {history_days} days of attendance history.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the Dayflow database with 3-role demo data.")
    parser.add_argument("--reset", action="store_true", help="Delete existing rows first")
    parser.add_argument("--employees", type=int, default=16, help="Number of employees to create")
    parser.add_argument("--days", type=int, default=120, help="Days of attendance history")
    args = parser.parse_args()
    main(args.reset, args.employees, args.days)
