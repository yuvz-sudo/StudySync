# StudySync

Per-user study dashboard: login, a stopwatch that records study sessions, and analytics charts.
A small demonstration of DBMS (MySQL, 3NF, view, trigger) and Data Visualisation (Pandas + Matplotlib) concepts.
See `DBMS_DV_CONCEPTS.md` for the concepts and viva notes.

## Setup

```bash
# 1. Database (MySQL 8) — creates the `studysync` DB, demo user `demo` / `demo1234`
mysql -u root < schema.sql
mysql -u root < seed.sql

# 2. Chart engine
cd analytics && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt && cd ..

# 3. Backend (http://localhost:5001)
cd backend && cp .env.example .env && npm install && npm run dev

# 4. Frontend (http://localhost:5173), in a second terminal
cd frontend && npm install && npm run dev
```

Edit `backend/.env` if your MySQL needs a password or you want your own `JWT_SECRET`.

## Layout

- `schema.sql`, `seed.sql` — tables `users`, `subjects`, `study_sessions`, `goals`, `tags`, `session_tags`, `audit_log`; views `v_subject_study_summary`, `v_tag_summary`; triggers for validation and auditing
- `backend/` — Express + TypeScript API (JWT auth, raw SQL via `mysql2`)
- `analytics/visualize.py` — per-user weekly-goals bar chart (Matplotlib), regenerated whenever sessions change; the donut and daily-activity line charts are interactive, in React
- `frontend/` — React + Vite + Tailwind
