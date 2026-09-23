# AgentSentry

**AgentSentry** is a security layer for AI Agents, providing robust protection through HoneyToken injection, Egress enforcement, rule-based and semantic security analysis, and a modern SOC dashboard.

## Features

- **HoneyToken Mesh**: Generates active decoys injected directly into the LLM system prompt context. If the AI leaks this token, egress is immediately blocked, and the agent is isolated.
- **Egress Enforcement**: A strict gateway evaluating all outbound data (payload and URLs).
- **Security Detectors**: Integrates rule-based policies and semantic analysis to block prompt injection, data exfiltration, and unsafe tool execution.
- **RBAC & Authentication**: JWT-based authentication with strict Role-Based Access Control (Admin, Analyst, Viewer).
- **SOC Dashboard**: A modern, real-time interface built with React, Vite, and native Vanilla CSS (with Spline 3D elements).

## Technology Stack

- **Backend**: FastAPI, SQLAlchemy (asyncpg/SQLite), Alembic, Pytest
- **Frontend**: React (TypeScript), Vite, Vanilla CSS
- **Security**: JWT (HttpOnly Cookies), Double Submit Cookie CSRF, Helmet-like Security Headers

## Setup Instructions

Local development does **not** use Docker. AgentSentry needs **port 8000** for the API. If another project (for example AgroSaarthi’s `agrosaarthi_backend` container) is already bound to 8000, stop that other service yourself first. AgentSentry will refuse to start rather than kill whatever is using the port.

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure you generate a secure `JWT_SECRET_KEY` in production. Local development uses SQLite (`DATABASE_URL=sqlite+aiosqlite:///dev.db`).

### One-command local start
From the repository root (Python 3.12 venv at `backend/.venv`, frontend deps already installed):

```bash
npm run dev
```

This starts:
- Backend: `http://127.0.0.1:8000` (health: `http://127.0.0.1:8000/health`)
- Frontend: `http://localhost:5173`

Default admin login: `admin@agentsentry.local` / `adminpassword`

### Database
Run migrations if needed:
```bash
alembic upgrade head
```

### Run services separately (optional)
Backend (from repo root, using the project venv — do not activate it manually):
```bash
backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Security Posture & Production Deployment

- **Deployment**: Configured for Render (`render.yaml`) and Vercel (`vercel.json`). 
- **Secrets Management**: Safe startup fails if `JWT_SECRET_KEY` is weak in production. Raw HoneyToken values are securely redacted from ordinary API endpoints and browser storage.
- **CORS/CSRF**: Strictly bound origins with no wildcards. Mutating endpoints protected via `x-csrf-token` correlation.
- **Rate Limiting**: Enforced on authentication, context delivery, and egress attempts to mitigate brute-force and DoS.

## Known Limitations

- The Rate Limiter uses an in-memory/per-process configuration which is a limitation for horizontally scaled production setups.
- PostgreSQL compatibility is supported by `database.py` and `alembic`, but should be independently verified before scaling.
