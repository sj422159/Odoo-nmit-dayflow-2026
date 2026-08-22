<p align="center">
  <img src="frontend/public/tecryst-logo.png" alt="Dayflow HRMS" width="180" />
</p>

<h1 align="center">Dayflow HRMS</h1>

<p align="center">
  <strong>A modern, full-stack Human Resource Management System with real-time attendance tracking, AI-powered leave approvals, payroll management, and ML-driven workforce analytics.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61dafb?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776ab?logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Mistral_AI-Integrated-ff6f00" alt="Mistral AI" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Role-Based Access](#role-based-access)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)

---

## Overview

Dayflow HRMS is an enterprise-grade HR management platform built for organizations that need real-time workforce management. It features a three-tier role system (Corporate Admin → HR Officer → Employee), AI-assisted decision making for leave approvals, interactive visual analytics, and a PWA-ready offline-first architecture.

All data is **real-time** — the dashboard subscribes over WebSocket with a polling fallback. There is no static mock JSON.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 · TypeScript 5.7 · Vite 6 · Tailwind CSS 3 · Recharts · TanStack Table · React Hook Form · Zod · Lucide Icons · Iconify · SweetAlert2 |
| **Backend** | Python 3.11+ · FastAPI · SQLAlchemy 2 · Alembic · Pydantic v2 · Pandas · scikit-learn · python-jose (JWT) · passlib (bcrypt) |
| **Database** | PostgreSQL 14+ |
| **AI/ML** | Mistral AI (`mistral-small-latest`) for leave approval recommendations · scikit-learn for attendance forecasting & anomaly detection |
| **Realtime** | WebSocket (native FastAPI) with automatic polling fallback |
| **PWA** | IndexedDB offline queueing · LocalStorage cache fallbacks · Service Worker ready |

---

## Project Structure

```
hrms/
├── frontend/                    # React SPA (Vite dev server on :5173)
│   ├── src/
│   │   ├── api/                 # API client, types, and interfaces
│   │   ├── components/          # Reusable UI components (AppShell, DataTable, etc.)
│   │   ├── context/             # Auth, Realtime, and Theme providers
│   │   ├── hooks/               # Custom hooks (useAsync, useMediaQuery)
│   │   ├── lib/                 # Utilities (format, offlineQueue, validation)
│   │   └── pages/               # Route-level page components
│   │       ├── admin/           # HR Admin pages (Employees, Approvals, Payroll, etc.)
│   │       └── home/            # Employee home dashboard widgets
│   ├── public/                  # Static assets and logos
│   └── package.json
│
├── backend/                     # FastAPI application (Uvicorn on :8000)
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/              # Versioned API routers
│   │   │       ├── auth.py      # Authentication, corporate admin, HR admin management
│   │   │       ├── attendance.py
│   │   │       ├── leave.py
│   │   │       ├── payroll.py
│   │   │       ├── employees.py
│   │   │       ├── holidays.py
│   │   │       ├── analytics.py
│   │   │       ├── chat.py
│   │   │       ├── company_settings.py
│   │   │       ├── notifications.py
│   │   │       └── ws.py        # WebSocket endpoint
│   │   ├── core/                # Config, security, mailer
│   │   ├── db/                  # Database session, base, seed
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── services/            # Business logic layer
│   │       ├── ai_leave_service.py    # Mistral AI leave evaluation
│   │       ├── analytics_service.py   # ML forecasting & anomaly detection
│   │       ├── attendance_service.py
│   │       ├── leave_service.py
│   │       ├── payroll_service.py
│   │       ├── settings_service.py
│   │       └── realtime.py            # WebSocket broadcast manager
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   └── .env.example
│
└── database/                    # Raw SQL schema reference (read-only)
```

---

## Features

### 🏢 Corporate Admin Portal (`/corporate/dashboard`)

- **System Dashboard** — Live bento stat cards showing total employees, HR administrators, and departments/organizations enrolled in the system.
- **HR Administrator Management** — Full DataTable listing of enrolled HR officers with search, sort, and one-click **Revoke Access** actions.
- **Add HR Administrator** — Provision new HR officer accounts with first name, last name, work email, and temporary password credentials.
- **Dedicated Sidebar Navigation** — Corporate-branded sidebar with Dashboard and HR Administrators tabs with live count badges.

### 👤 Employee Self-Service

- **Dashboard** — Personalized home with real-time attendance status, leave balance summary, and quick-action widgets.
- **Attendance** — One-click check-in/check-out with live timer, weekly attendance ribbon, and shift status tracking.
- **Leave Management** — Submit leave requests (Paid, Sick, Unpaid) with file attachment support, view leave balances, and track request statuses. Offline queueing via IndexedDB ensures requests are saved even without network connectivity.
- **Payroll & Payslips** — View salary structure, download monthly payslip statements, and track YTD compensation breakdown.
- **Profile Management** — Edit personal information, emergency contacts, bank details, and avatar.
- **Company Holidays** — View organizational holiday calendar with XLSX import/export capabilities.
- **AI Chat Assistant** — Conversational interface for HR queries, policy questions, and general assistance.

### 📊 Visual Analytics (`/analysis/*`)

- **Attendance Analytics** — Interactive Recharts donut chart showing attendance distribution (Present, Leave, Half Day, Absent) with animated transitions and detailed legend cards.
- **Payslip Analytics** — 60/40 split layout with monthly net pay vs deductions bar chart and salary structure composition pie chart.
- **Bento Stat Cards** — At-a-glance metrics for attendance health, average daily hours, punctuality score, and leave balance.

### 📋 Tabular Reports (`/reports/*`)

- **Attendance Report** — TanStack DataTable with daily shift log: date, shift schedule, check-in/out times, hours worked, and status badges.
- **Payslip Report** — Itemized tabular statements with period, working/paid/LOP days, gross salary, deductions, net take-home, and a details modal.
- **Search & Filter** — Real-time search across all report fields.

### 🛡️ HR Administration (`/admin/*`)

- **Employee Directory** — Full employee management with DataTable, search, department filter, and detailed employee profiles.
- **Add Employee** — Multi-field onboarding form with validation (React Hook Form + Zod).
- **Department Management** — Create and manage organizational departments.
- **Attendance Board** — Organization-wide attendance overview with daily status grid.
- **Leave Approvals** — Three-tab interface (**Pending**, **Approved**, **Rejected**) with live count badges, detailed leave request cards, and one-click approve/reject actions.
- **AI-Powered Leave Evaluation** — Mistral AI integration that analyzes leave descriptions and supporting evidence to generate approval recommendations with confidence scores and reasoning breakdowns.
- **Payroll Administration** — Run monthly payroll cycles, view disbursement summaries, and manage salary structures.
- **Activity History** — Audit log of system-wide employee activities and events.
- **Workforce Insights** — ML-driven analytics with attendance forecasting, anomaly detection, and trend analysis using scikit-learn.
- **Company Settings** — Dynamic configuration of business rules:
  - `WORKDAY_START` (HH:MM format)
  - `WORKDAY_MINUTES` (full day threshold)
  - `HALF_DAY_MINUTES` (half day threshold)
  - `ANNUAL_PAID_LEAVE_DAYS` (paid leave allocation)
  - `ANNUAL_SICK_LEAVE_DAYS` (sick leave allocation)

### 🔐 Authentication & Security

- **Multi-role JWT Authentication** — Separate authentication flows for Corporate Admin, HR Officer, and Employee roles.
- **Email Verification** — Token-based email verification with resend capability (local `.eml` file output in development mode).
- **Password Policy** — Minimum 10 characters with strength validation.
- **Refresh Token Rotation** — Secure token refresh mechanism with configurable expiry.
- **Route Guards** — Role-based route protection (`RequireAuth`, `RequireAdmin`, `RequireCorporate`).

### 🌐 PWA & Offline-First

- **IndexedDB Offline Queue** — Leave requests and actions queued locally when offline, synced automatically on reconnection.
- **LocalStorage Cache Fallbacks** — Profile, attendance, time-off, and payslip data cached for instant loading.
- **Offline Banner** — Visual indicator when the application is offline with pending sync count.

### ⚡ Real-time Updates

- **WebSocket Integration** — Live updates for attendance check-in/out, leave approvals, payroll runs, and notification delivery.
- **Automatic Fallback** — Graceful degradation to polling when WebSocket connection is unavailable.
- **Event-Driven Refresh** — Components subscribe to specific event channels and re-fetch data on relevant broadcasts.

---

## Role-Based Access

| Feature | Corporate Admin | HR Officer | Employee |
|---|:---:|:---:|:---:|
| System Dashboard (employee/HR counts) | ✅ | — | — |
| HR Admin Management (create/revoke) | ✅ | — | — |
| Employee Directory & Onboarding | — | ✅ | — |
| Department Management | — | ✅ | — |
| Attendance Board (org-wide) | — | ✅ | — |
| Leave Approvals + AI Evaluation | — | ✅ | — |
| Payroll Administration | — | ✅ | — |
| Company Settings | — | ✅ | — |
| Workforce Insights (ML) | — | ✅ | — |
| Activity History (audit log) | — | ✅ | — |
| Personal Dashboard | — | — | ✅ |
| Check-in / Check-out | — | — | ✅ |
| Leave Requests | — | — | ✅ |
| Payslip Viewing | — | — | ✅ |
| Profile Management | — | — | ✅ |
| Visual Analytics & Reports | — | — | ✅ |
| Holiday Calendar | — | ✅ | ✅ |
| AI Chat Assistant | — | ✅ | ✅ |

---

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| **Node.js** | 18+ |
| **Python** | 3.11+ |
| **PostgreSQL** | 14+ (running locally) |
| **pip** | Latest |
| **npm** | 9+ |

---

## Setup & Installation

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-org/dayflow-hrms.git
cd dayflow-hrms
```

### Step 2 — Create the PostgreSQL Database

```bash
# Using psql (adjust credentials to match your .env)
psql -U postgres -c "CREATE USER dayflow WITH PASSWORD 'dayflow';"
psql -U postgres -c "CREATE DATABASE dayflow OWNER dayflow;"
```

Or with pgAdmin: create a database named `dayflow` owned by your PostgreSQL user.

### Step 3 — Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials and API keys (see Environment Variables below)

# Run database migrations
alembic upgrade head

# (Optional) Seed demo data — creates sample employees, attendance records, and leave requests
python -m app.db.seed

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**
Interactive API docs at **http://localhost:8000/docs**

### Step 4 — Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Frontend runs at **http://localhost:5173**

### Step 5 — Sign In

| Role | How to Access |
|---|---|
| **Corporate Admin** | Navigate to `/corporate/signin` — use the seeded corporate admin credentials |
| **HR Officer** | Navigate to `/signin` — use HR credentials created by a Corporate Admin |
| **Employee** | Navigate to `/signup` to register, or `/signin` with seeded employee credentials |

---

## Environment Variables

### Backend (`backend/.env`)

```bash
# --- Application ---
APP_NAME=Dayflow HRMS
APP_ENV=development                          # development | production
FRONTEND_URL=http://localhost:5173

# --- Database ---
POSTGRES_USER=dayflow
POSTGRES_PASSWORD=dayflow
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=dayflow

# --- Security ---
# Generate a strong key: python -c "import secrets; print(secrets.token_urlsafe(48))"
SECRET_KEY=change-me-in-production-please-use-a-long-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=14
EMAIL_TOKEN_EXPIRE_HOURS=48
JWT_ALGORITHM=HS256

# --- CORS ---
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# --- Email (development mode writes .eml files to disk) ---
MAIL_OUTBOX_DIR=var/mail
MAIL_FROM=no-reply@dayflow.co
AUTO_VERIFY_EMAIL=true                       # Set false to require email verification

# --- Business Rules (HR-configurable via Settings UI) ---
WORKDAY_START=09:00                          # Default shift start time (HH:MM)
WORKDAY_MINUTES=480                          # Full workday = 8 hours
HALF_DAY_MINUTES=240                         # Half day threshold = 4 hours
ANNUAL_PAID_LEAVE_DAYS=18                    # Annual paid leave allocation
ANNUAL_SICK_LEAVE_DAYS=10                    # Annual sick leave allocation

# --- AI Integration ---
MISTRAL_API_KEY=your-mistral-api-key-here    # Get from https://console.mistral.ai
```

### Frontend (`frontend/.env`)

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

> **Note:** Business rules (`WORKDAY_START`, `WORKDAY_MINUTES`, etc.) serve as default fallback values. Once an HR administrator updates them via the **Company Settings** UI (`/admin/settings`), the database values take priority over `.env` defaults.

---

## Running the Application

### Development (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate         # Windows
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### Production Build

```bash
# Frontend production bundle
cd frontend
npm run build                 # Output in dist/

# Serve with any static file server (nginx, serve, etc.)
npx serve dist -l 5173
```

---

## API Documentation

FastAPI auto-generates interactive API documentation:

| URL | Format |
|---|---|
| `http://localhost:8000/docs` | Swagger UI (interactive) |
| `http://localhost:8000/redoc` | ReDoc (read-friendly) |

### Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/signup` | Register a new employee account |
| `POST` | `/api/v1/auth/signin` | Sign in (employee, HR, or corporate) |
| `POST` | `/api/v1/auth/admins` | Create HR administrator (corporate only) |
| `GET` | `/api/v1/auth/corporate-summary` | System-wide employee/HR/department stats |
| `GET` | `/api/v1/auth/hr-admins` | List all enrolled HR administrators |
| `DELETE` | `/api/v1/auth/hr-admins/{id}` | Revoke HR administrator access |
| `GET` | `/api/v1/auth/me` | Current session info |
| `POST` | `/api/v1/attendance/check-in` | Employee check-in |
| `POST` | `/api/v1/attendance/check-out` | Employee check-out |
| `GET` | `/api/v1/attendance/me/week` | Weekly attendance summary |
| `POST` | `/api/v1/leave/requests` | Submit a leave request |
| `POST` | `/api/v1/leave/requests/{id}/ai-evaluate` | AI leave evaluation (Mistral) |
| `PUT` | `/api/v1/leave/requests/{id}/decide` | Approve/reject leave request |
| `GET` | `/api/v1/payroll/me` | Employee payroll & payslips |
| `POST` | `/api/v1/payroll/run` | Run monthly payroll cycle (HR) |
| `GET` | `/api/v1/analytics/me` | Personal analytics & insights |
| `GET` | `/api/v1/analytics/insights` | Organization-wide ML insights (HR) |
| `GET/PUT` | `/api/v1/settings` | Company settings (HR) |
| `GET` | `/api/v1/holidays` | List company holidays |
| `POST` | `/api/v1/holidays/import` | Bulk import holidays (XLSX) |
| `GET` | `/ws` | WebSocket endpoint for real-time events |

---

## Scripts Reference

| Location | Command | Purpose |
|---|---|---|
| `backend/` | `uvicorn app.main:app --reload --port 8000` | Start API server (development) |
| `backend/` | `alembic upgrade head` | Apply all pending database migrations |
| `backend/` | `alembic revision --autogenerate -m "msg"` | Generate a new migration from model changes |
| `backend/` | `python -m app.db.seed` | Seed demo data (employees, attendance, leaves) |
| `frontend/` | `npm run dev` | Start Vite development server |
| `frontend/` | `npm run build` | TypeScript check + production build |
| `frontend/` | `npm run preview` | Preview production build locally |
| `frontend/` | `npm run typecheck` | TypeScript type-check only (no emit) |

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'jose'`

This means `pip install` ran against a different Python interpreter than `uvicorn` is using.

```bash
# Verify you're inside the virtual environment (prompt should show (venv))
where python       # Windows
which python       # macOS / Linux

# Reinstall inside the active venv
pip install -r requirements.txt
```

### Database connection refused

Ensure PostgreSQL is running and the credentials in `backend/.env` match your local setup:

```bash
# Test connection
psql -U dayflow -d dayflow -h localhost -p 5432
```

### Frontend can't reach the API

Check that `VITE_API_BASE_URL` in `frontend/.env` points to `http://localhost:8000/api/v1` and that the backend server is running.

### Alembic migration errors

If you encounter migration conflicts after pulling new changes:

```bash
cd backend
alembic downgrade base    # Reset all migrations
alembic upgrade head      # Re-apply from scratch
python -m app.db.seed     # Re-seed demo data
```

### CORS errors in browser console

Ensure `CORS_ORIGINS` in `backend/.env` includes your frontend URL:

```bash
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## License

This project is proprietary and confidential. All rights reserved.

---

<p align="center">
  Built with ❤️ by <strong>TeCryst</strong>
</p>
