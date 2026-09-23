from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from backend.database import get_db
from backend.models.alert import Alert
from backend.models.agent import Agent
from backend.models.user import User
from backend.schemas.alert import AlertResponse
from backend.api.deps import get_current_user

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Alert).join(Agent, Alert.agent_id == Agent.id).order_by(Alert.created_at.desc()).offset(offset).limit(limit)
    if current_user.role != "admin":
        stmt = stmt.where(Agent.owner_id == current_user.id)
        
    result = await db.execute(stmt)
    return result.scalars().all()
