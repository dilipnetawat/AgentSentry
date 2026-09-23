from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.agent import Agent
from backend.models.user import User
from backend.schemas.agent import AgentCreate, AgentResponse
from backend.api.deps import get_current_user, require_role

router = APIRouter(prefix="/api/v1/agents", tags=["Agents"])

def verify_agent_ownership(agent: Agent, user: User):
    """Raise 404 to prevent IDOR if not owner or admin"""
    if user.role != "admin" and agent.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Agent not found")

@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def register_agent(agent_in: AgentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role(["admin", "analyst"]))):
    """Register a new AI agent."""
    db_agent = Agent(**agent_in.model_dump(exclude={"owner_id"}))
    if agent_in.owner_id and current_user.role == "admin":
        db_agent.owner_id = agent_in.owner_id
    else:
        db_agent.owner_id = current_user.id
        
    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent

@router.get("", response_model=List[AgentResponse])
async def list_agents(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """List agents. Admins see all, others see their own."""
    # Enforce maximum limit to prevent unbounded retrieval
    if limit > 100:
        limit = 100
        
    stmt = select(Agent).order_by(Agent.created_at.desc()).offset(offset).limit(limit)
    
    if current_user.role != "admin":
        stmt = stmt.where(Agent.owner_id == current_user.id)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get agent details."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    verify_agent_ownership(agent, current_user)
    return agent

@router.post("/{agent_id}/isolate", response_model=AgentResponse)
async def isolate_agent(agent_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role(["admin", "analyst"]))):
    """
    Isolate an agent.
    Requires Admin or Analyst role.
    """
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    verify_agent_ownership(agent, current_user)
    
    agent.status = "isolated"
    await db.commit()
    await db.refresh(agent)
    return agent

@router.post("/{agent_id}/restore", response_model=AgentResponse)
async def restore_agent(agent_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role(["admin", "analyst"]))):
    """Restore an isolated agent. Requires Admin or Analyst role."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    verify_agent_ownership(agent, current_user)
    
    agent.status = "active"
    await db.commit()
    await db.refresh(agent)
    return agent
