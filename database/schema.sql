-- Reference DDL for Dayflow HRMS (Decentralized Identity & Role Architecture).
-- Alembic owns the live schema (`alembic upgrade head`); this file mirrors it
-- for review and for tools that read plain SQL. Do not run both.

CREATE TABLE corp_admins (
    id                SERIAL PRIMARY KEY,
    admin_code        VARCHAR(30)  NOT NULL UNIQUE,
    email             VARCHAR(255) NOT NULL UNIQUE,
    hashed_password   VARCHAR(255) NOT NULL,
    first_name        VARCHAR(80)  NOT NULL,
    last_name         VARCHAR(80)  NOT NULL,
    phone             VARCHAR(24),
    avatar_url        VARCHAR(512),
    is_verified       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ix_corp_admins_email_lower ON corp_admins (LOWER(email));
CREATE INDEX ix_corp_admins_admin_code ON corp_admins (admin_code);

CREATE TABLE hr_officers (
    id                      SERIAL PRIMARY KEY,
    hr_code                 VARCHAR(30)  NOT NULL UNIQUE,
    email                   VARCHAR(255) NOT NULL UNIQUE,
    hashed_password         VARCHAR(255) NOT NULL,
    first_name              VARCHAR(80)  NOT NULL,
    last_name               VARCHAR(80)  NOT NULL,
    phone                   VARCHAR(24),
    department              VARCHAR(80)  NOT NULL DEFAULT 'Human Resources',
    designation             VARCHAR(80)  NOT NULL DEFAULT 'HR Officer',
    avatar_url              VARCHAR(512),
    created_by_corpadmin_id INTEGER REFERENCES corp_admins(id) ON DELETE SET NULL,
    is_verified             BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ix_hr_officers_email_lower ON hr_officers (LOWER(email));
CREATE INDEX ix_hr_officers_hr_code ON hr_officers (hr_code);

CREATE TABLE employees (
    id                SERIAL PRIMARY KEY,
    employee_code     VARCHAR(30)  NOT NULL UNIQUE,
    email             VARCHAR(255) NOT NULL UNIQUE,
    hashed_password   VARCHAR(255) NOT NULL,
    first_name        VARCHAR(80)  NOT NULL,
    last_name         VARCHAR(80)  NOT NULL,
    phone             VARCHAR(24),
    address           TEXT,
    avatar_url        VARCHAR(512),
    department        VARCHAR(80)  NOT NULL DEFAULT 'Unassigned',
    designation       VARCHAR(80)  NOT NULL DEFAULT 'Associate',
    employment_type   VARCHAR(16)  NOT NULL DEFAULT 'FULL_TIME',
    date_of_joining   DATE         NOT NULL,
    hr_id             INTEGER REFERENCES hr_officers(id) ON DELETE SET NULL,
    manager_id        INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    is_verified       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_employees_employment_type
        CHECK (employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','INTERN'))
);
CREATE UNIQUE INDEX ix_employees_email_lower ON employees (LOWER(email));
CREATE INDEX ix_employees_employee_code ON employees (employee_code);
CREATE INDEX ix_employees_department ON employees (department);

CREATE TABLE employee_documents (
    id                SERIAL PRIMARY KEY,
    employee_id       INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type     VARCHAR(60) NOT NULL,
    file_path         VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_employee_document_type UNIQUE (employee_id, document_type),
    CONSTRAINT ck_employee_document_type
        CHECK (document_type IN ('PAN_CARD','BANK_DETAILS','ADDRESS_PROOF','EXPERIENCE_LETTER','AADHAAR_CARD'))
);
CREATE INDEX ix_employee_documents_employee_id ON employee_documents (employee_id);

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
    reviewer_type   VARCHAR(20),
    reviewer_id     INTEGER,
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
    id              SERIAL PRIMARY KEY,
    recipient_type  VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
    recipient_id    INTEGER NOT NULL,
    category        VARCHAR(32) NOT NULL DEFAULT 'general',
    title           VARCHAR(160) NOT NULL,
    body            TEXT,
    link            VARCHAR(255),
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_recipient ON notifications (recipient_type, recipient_id);
