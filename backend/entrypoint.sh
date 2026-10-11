#!/usr/bin/env bash
set -e

echo "[AgentSentry] Starting backend container entrypoint..."

# Wait for PostgreSQL database readiness using Python async connection check
python - << 'EOF'
import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

url = os.getenv("DATABASE_URL")
if not url:
    print("[AgentSentry] ERROR: DATABASE_URL is not set.")
    sys.exit(1)

if url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

async def check_db():
    print("[AgentSentry] Verifying database connectivity...")
    engine = create_async_engine(url)
    for attempt in range(1, 31):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
                print("[AgentSentry] Database connection verified successfully.")
                await engine.dispose()
                return True
        except Exception as e:
            print(f"[AgentSentry] Waiting for database ({attempt}/30)...: {e}")
            await asyncio.sleep(2)
    print("[AgentSentry] ERROR: Database connection timed out after 60s.")
    await engine.dispose()
    sys.exit(1)

asyncio.run(check_db())
EOF

echo "[AgentSentry] Executing Alembic database schema migrations..."
alembic upgrade head

echo "[AgentSentry] Seeding operator user accounts..."
python -m backend.seed_admin

if [ "$#" -eq 0 ]; then
    echo "[AgentSentry] Launching FastAPI uvicorn server..."
    exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
else
    echo "[AgentSentry] Executing command: $@"
    exec "$@"
fi
