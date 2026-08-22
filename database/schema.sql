-- Reference DDL for Dayflow HRMS.
-- Alembic owns the live schema (`alembic upgrade head`); this file mirrors it
-- for review and for tools that read plain SQL. Do not run both.

CREATE TABLE users (
    id                SERIAL PRIMARY KEY,
    employee_code     VARCHAR(24)  NOT NULL UNIQUE,
    email             VARCHAR(255) NOT NULL,
    hashed_password   VARCHAR(255) NOT NULL,
    role              VARCHAR(16)  NOT NULL DEFAULT 'EMPLOYEE',
    is_verified       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_role CHECK (role IN ('ADMIN','EMPLOYEE'))
);
CREATE UNIQUE INDEX ix_users_email_lower ON users (email);
CREATE INDEX ix_users_employee_code ON users (employee_code);

CREATE TABLE employees (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name        VARCHAR(80) NOT NULL,
    last_name         VARCHAR(80) NOT NULL,
    phone             VARCHAR(24),
    address           TEXT,
    avatar_url        VARCHAR(512),
    department        VARCHAR(80) NOT NULL DEFAULT 'Unassigned',
    designation       VARCHAR(80) NOT NULL DEFAULT 'Associate',
    employment_type   VARCHAR(16) NOT NULL DEFAULT 'FULL_TIME',
    date_of_joining   DATE NOT NULL,
    manager_id        INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_employees_employment_type
        CHECK (employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERN'))
);
CREATE INDEX ix_employees_department ON employees (department);

CREATE TABLE employee_documents (
    id           SERIAL PRIMARY KEY,
    employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title        VARCHAR(120) NOT NULL,
    category     VARCHAR(60)  NOT NULL DEFAULT 'General',
    file_url     VARCHAR(512) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attendance_records (
    id             SERIAL PRIMARY KEY,
    employee_id    INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date      DATE NOT NULL,
    check_in       TIMESTAMPTZ,
    check_out      TIMESTAMPTZ,
    worked_minutes INTEGER NOT NULL DEFAULT 0,
    status         VARCHAR(16) NOT NULL DEFAULT 'ABSENT',
    note           VARCHAR(255),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, work_date),
    CONSTRAINT ck_attendance_status CHECK (status IN ('PRESENT','ABSENT','HALF_DAY','LEAVE')),
    CONSTRAINT ck_attendance_worked_minutes CHECK (worked_minutes >= 0)
);
CREATE INDEX ix_attendance_records_work_date ON attendance_records (work_date);
CREATE INDEX ix_attendance_records_status ON attendance_records (status);

CREATE TABLE leave_requests (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type      VARCHAR(16) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    days            INTEGER NOT NULL,
    remarks         TEXT,
    status          VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    reviewer_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    review_comment  TEXT,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_leave_type CHECK (leave_type IN ('PAID','SICK','UNPAID')),
    CONSTRAINT ck_leave_status CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
    CONSTRAINT ck_leave_date_order CHECK (end_date >= start_date),
    CONSTRAINT ck_leave_days_positive CHECK (days > 0)
);
CREATE INDEX ix_leave_requests_status ON leave_requests (status);
CREATE INDEX ix_leave_requests_start_date ON leave_requests (start_date);

CREATE TABLE leave_balances (
    id           SERIAL PRIMARY KEY,
    employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    year         INTEGER NOT NULL,
    paid_total   INTEGER NOT NULL DEFAULT 18,
    paid_used    INTEGER NOT NULL DEFAULT 0,
    sick_total   INTEGER NOT NULL DEFAULT 10,
    sick_used    INTEGER NOT NULL DEFAULT 0,
    unpaid_used  INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_leave_balance_employee_year UNIQUE (employee_id, year),
    CONSTRAINT ck_leave_balance_used CHECK (paid_used >= 0 AND sick_used >= 0)
);

CREATE TABLE salary_structures (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    basic           NUMERIC(12,2) NOT NULL,
    hra             NUMERIC(12,2) NOT NULL DEFAULT 0,
    allowances      NUMERIC(12,2) NOT NULL DEFAULT 0,
    deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,
    effective_from  DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_salary_employee_effective UNIQUE (employee_id, effective_from),
    CONSTRAINT ck_salary_non_negative
        CHECK (basic >= 0 AND hra >= 0 AND allowances >= 0 AND deductions >= 0)
);

CREATE TABLE payslips (
    id             SERIAL PRIMARY KEY,
    employee_id    INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_year    INTEGER NOT NULL,
    period_month   INTEGER NOT NULL,
    currency       VARCHAR(3) NOT NULL DEFAULT 'USD',
    working_days   INTEGER NOT NULL,
    paid_days      NUMERIC(5,2) NOT NULL,
    lop_days       NUMERIC(5,2) NOT NULL DEFAULT 0,
    gross          NUMERIC(12,2) NOT NULL,
    deductions     NUMERIC(12,2) NOT NULL,
    net_pay        NUMERIC(12,2) NOT NULL,
    generated_at   TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payslip_employee_period UNIQUE (employee_id, period_year, period_month),
    CONSTRAINT ck_payslip_month CHECK (period_month BETWEEN 1 AND 12)
);

CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category    VARCHAR(32) NOT NULL DEFAULT 'general',
    title       VARCHAR(160) NOT NULL,
    body        TEXT,
    link        VARCHAR(255),
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_user_id ON notifications (user_id);
