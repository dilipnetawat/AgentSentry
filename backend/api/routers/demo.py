from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import require_role
from backend.database import get_db
from backend.models.agent import Agent
from backend.models.alert import Alert
from backend.models.honeytoken import HoneyToken
from backend.models.ingestion import IngestionRecord
from backend.models.security_event import SecurityEvent
from backend.models.user import User

router = APIRouter(prefix="/api/v1/demo", tags=["Guided Demo"])

DEMO_AGENT_NAME = "DEMO - Research Agent"


@router.post("/reset")
async def reset_demo(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"])),
):
    """Remove only the current user's explicitly marked guided-demo resources."""
    result = await db.execute(
        select(Agent.id).where(
            Agent.owner_id == current_user.id,
            Agent.name == DEMO_AGENT_NAME,
        )
    )
    agent_ids = list(result.scalars().all())
    if not agent_ids:
        return {"deleted_agents": 0}

    await db.execute(delete(Alert).where(Alert.agent_id.in_(agent_ids)))
    await db.execute(delete(SecurityEvent).where(SecurityEvent.agent_id.in_(agent_ids)))
    await db.execute(delete(IngestionRecord).where(IngestionRecord.agent_id.in_(agent_ids)))
    await db.execute(delete(HoneyToken).where(HoneyToken.agent_id.in_(agent_ids)))
    await db.execute(delete(Agent).where(Agent.id.in_(agent_ids)))
    await db.commit()
    return {"deleted_agents": len(agent_ids)}
