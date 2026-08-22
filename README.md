# Dayflow HRMS

A full-stack HR management system with real-time attendance, leave management,
payroll, and ML-driven analytics (attendance forecasting + anomaly detection).

**Stack**
- Frontend: React + TypeScript + Vite + Tailwind CSS + Recharts
- Backend: Python + FastAPI + Pandas + scikit-learn + SQLAlchemy + Alembic
- Database: PostgreSQL
- Realtime: WebSocket + polling fallback

## Project structure

```
dayflow/
├── frontend/     React app (Vite dev server on :5173)
├── backend/      FastAPI app (Uvicorn on :8000)
└── database/     Raw SQL schema reference (Alembic migrations are the source of truth)
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 14+ running locally

## 1. Database

Create the database and user (adjust to match `backend/.env`):

```bash
psql -U postgres -c "CREATE USER dayflow WITH PASSWORD 'dayflow';"
psql -U postgres -c "CREATE DATABASE dayflow OWNER dayflow;"
```

## 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # edit values if your local Postgres differs

# Apply migrations
alembic upgrade head

# Optional: seed demo data (admin + employees + attendance history)
python -m app.db.seed   # or the equivalent seed command in app/db/

uvicorn app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000** — interactive API docs at
**http://localhost:8000/docs**.

### Troubleshooting: `ModuleNotFoundError`

If you see `ModuleNotFoundError: No module named 'jose'` (or `passlib`, etc.)
even though `requirements.txt` lists them, it means `pip install` ran against a
**different Python interpreter** than the one `uvicorn` is using. Fix:

```bash
# Confirm you're inside the venv (prompt should show (venv))
which python      # macOS/Linux
where python       # Windows

# Reinstall inside the active venv
pip install -r requirements.txt
```

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # if present; otherwise set VITE_API_BASE_URL below
npm run dev
```

Frontend runs at **http://localhost:5173** and expects the API at
`http://localhost:8000/api/v1` by default (see `VITE_API_BASE_URL` in
`.env`).

## 4. Log in

Use the seed script's admin account, or sign up a new account at
`/signup` and select a role. Admin accounts see the `/admin/*` pages;
employee accounts see the personal dashboard.

## Scripts reference

| Location | Command | Purpose |
|---|---|---|
| `backend/` | `uvicorn app.main:app --reload --port 8000` | Run API |
| `backend/` | `alembic upgrade head` | Apply DB migrations |
| `backend/` | `alembic revision --autogenerate -m "msg"` | New migration |
| `frontend/` | `npm run dev` | Vite dev server |
| `frontend/` | `npm run build` | Production build |
| `frontend/` | `npm run typecheck` | TypeScript check only |

## Notes

- All data is real-time — the dashboard polls/subscribes over WebSocket,
  there is no static mock JSON.
- `database/schema.sql` is a **reference** snapshot of the schema for quick
  reading; Alembic migrations under `backend/alembic/versions/` are the
  actual source of truth — always run `alembic upgrade head`, don't apply
  `schema.sql` directly against a migrated database.
