"""Generate a realistic demo dataset: `python -m app.db.seed`.

The schema itself carries no data — this is an explicit, idempotent CLI so the
analytics models have history to train on. Use `--reset` to wipe first.
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
from app.models.employee import Employee, EmployeeDocument
from app.models.enums import AttendanceStatus, EmploymentType, LeaveStatus, LeaveType, Role
from app.models.leave import LeaveBalance, LeaveRequest
from app.models.notification import Notification
from app.models.payroll import Payslip, SalaryStructure
from app.models.user import User
from app.services.attendance_service import is_working_day
from app.services.payroll_service import run_payroll

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

PASSWORD = "Password@123"


def wipe(db):
    for model in (Notification, Payslip, SalaryStructure, LeaveBalance, LeaveRequest,
                  AttendanceRecord, EmployeeDocument, Employee, User):
        try:
            db.execute(delete(model))
        except Exception:
            pass
    db.commit()
    print("Cleared existing rows.")


def make_user(db, code, email, role, first, last, dept, title, joined):
    user = User(
        employee_code=code,
        email=email,
        hashed_password=hash_password(PASSWORD),
        role=role.value,
        is_verified=True,
        is_active=True,
        approval_status="APPROVED",
    )
    db.add(user)
    db.flush()
    employee = Employee(
        user_id=user.id,
        first_name=first,
        last_name=last,
        department=dept,
        designation=title,
        employment_type=random.choice(
            [EmploymentType.FULL_TIME.value] * 5 + [EmploymentType.CONTRACT.value, EmploymentType.PART_TIME.value]
        ),
        date_of_joining=joined,
        phone=f"+1 555 0{random.randint(100, 999)} {random.randint(100, 999)}",
        address=f"{random.randint(10, 900)} Alder Street, Springfield",
    )
    db.add(employee)
    db.flush()
    return user, employee


def make_corporate_user(db):
    user = User(
        email="corp.admin@tecryst.com",
        hashed_password=hash_password(PASSWORD),
        role=Role.CORPORATE.value,
        is_verified=True,
        is_active=True,
        approval_status="APPROVED",
    )
    db.add(user)
    db.flush()
    return user


def seed_attendance(db, employee: Employee, days: int):
    """Each person gets a stable behaviour profile so the ML models see signal."""
    reliability = random.uniform(0.80, 0.99)
    punctuality = random.gauss(6, 9)  # average minutes past 09:00
    today = date.today()
    for offset in range(days, -1, -1):
        day = today - timedelta(days=offset)
        if not is_working_day(day) or day < employee.date_of_joining:
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


def seed_leaves(db, employee: Employee, admin_user_id: int):
    today = date.today()
    for _ in range(random.randint(0, 3)):
        start = today - timedelta(days=random.randint(5, 80))
        while not is_working_day(start):
            start += timedelta(days=1)
        span = random.randint(0, 3)
        end = start + timedelta(days=span)
        days = len([d for d in (start + timedelta(n) for n in range((end - start).days + 1)) if is_working_day(d)])
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
            reviewer_id=admin_user_id,
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
            if not is_working_day(day):
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

    # A couple of live pending requests so the approval queue is not empty.
    if random.random() < 0.35:
        start = today + timedelta(days=random.randint(2, 20))
        while not is_working_day(start):
            start += timedelta(days=1)
        end = start + timedelta(days=random.randint(0, 2))
        days = len([d for d in (start + timedelta(n) for n in range((end - start).days + 1)) if is_working_day(d)])
        if days:
            db.add(LeaveRequest(
                employee_id=employee.id, leave_type=random.choice(list(LeaveType)).value,
                start_date=start, end_date=end, days=days,
                remarks="Planned time off", status=LeaveStatus.PENDING.value,
            ))


def main(reset: bool, employee_count: int, history_days: int):
    db = SessionLocal()
    try:
        if reset:
            wipe(db)
        if db.scalar(select(User).limit(1)):
            print("Database already has users. Re-run with --reset to rebuild.")
            return

        joined = date.today() - timedelta(days=history_days + 60)
        corporate_user = make_corporate_user(db)
        admin_user, admin_employee = make_user(
            db, "DF-1000", "hr.admin@tecryst.com", Role.HR_ADMIN, "Amara", "Njoku",
            "People Ops", "HR Officer", joined,
        )
        db.add(SalaryStructure(
            employee_id=admin_employee.id, basic=Decimal("6200.00"), hra=Decimal("1400.00"),
            allowances=Decimal("600.00"), deductions=Decimal("820.00"),
            effective_from=joined, currency="INR",
        ))
        db.add(LeaveBalance(employee_id=admin_employee.id, year=date.today().year,
                            paid_total=settings.ANNUAL_PAID_LEAVE_DAYS,
                            sick_total=settings.ANNUAL_SICK_LEAVE_DAYS))
        db.flush()

        employees = [admin_employee]
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
            email = "employee@tecryst.com" if index == 0 else f"{first.lower()}.{last.lower()}@dayflow.co"
            joined_on = date.today() - timedelta(days=random.randint(90, 1500))
            _, employee = make_user(db, code, email, Role.EMPLOYEE, first, last, dept, title, joined_on)
            employee.manager_id = admin_employee.id
            base = Decimal(random.randrange(3200, 8800, 100))
            db.add(SalaryStructure(
                employee_id=employee.id, basic=base,
                hra=(base * Decimal("0.22")).quantize(Decimal("0.01")),
                allowances=Decimal(random.randrange(200, 900, 50)),
                deductions=(base * Decimal("0.11")).quantize(Decimal("0.01")),
                effective_from=max(joined_on, date.today() - timedelta(days=365)),
                currency="INR",
            ))
            db.add(LeaveBalance(employee_id=employee.id, year=date.today().year,
                                paid_total=settings.ANNUAL_PAID_LEAVE_DAYS,
                                sick_total=settings.ANNUAL_SICK_LEAVE_DAYS))
            db.add(EmployeeDocument(employee_id=employee.id, title="Offer letter",
                                    category="Contract", file_url="/documents/offer-letter.pdf"))
            employees.append(employee)
        db.flush()

        for employee in employees:
            seed_attendance(db, employee, history_days)
        db.flush()
        for employee in employees:
            seed_leaves(db, employee, admin_user.id)
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

        db.add(Notification(user_id=admin_user.id, category="system",
                            title="Welcome to Dayflow",
                            body="Demo data is loaded. Open Insights to see the forecast.",
                            link="/admin/analytics"))
        db.commit()

        print("\nSeed complete.")
        print(f"  Corporate: corp.admin@tecryst.com / {PASSWORD}")
        print(f"  HR admin : hr.admin@tecryst.com / {PASSWORD}")
        print(f"  Employee : employee@tecryst.com / {PASSWORD}")
        print(f"  {len(employees)} people, {history_days} days of attendance history.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the Dayflow database with demo data.")
    parser.add_argument("--reset", action="store_true", help="Delete existing rows first")
    parser.add_argument("--employees", type=int, default=18, help="Number of employees to create")
    parser.add_argument("--days", type=int, default=120, help="Days of attendance history")
    args = parser.parse_args()
    main(args.reset, args.employees, args.days)
