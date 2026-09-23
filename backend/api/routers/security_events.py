from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID
from backend.database import get_db
from backend.models.security_event import SecurityEvent
from backend.models.agent import Agent
from backend.models.user import User
from backend.schemas.security_event import SecurityEventResponse
from backend.api.deps import get_current_user

router = APIRouter(prefix="/api/v1/security-events", tags=["Security Events"])

@router.get("", response_model=List[SecurityEventResponse])
async def list_security_events(
    agent_id: UUID | None = Query(None, description="Filter by agent ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(SecurityEvent).join(Agent, SecurityEvent.agent_id == Agent.id).order_by(SecurityEvent.created_at.desc()).offset(offset).limit(limit)
    if current_user.role != "admin":
        stmt = stmt.where(Agent.owner_id == current_user.id)
    if agent_id:
        stmt = stmt.where(SecurityEvent.agent_id == agent_id)
        
    result = await db.execute(stmt)
    return result.scalars().all()
