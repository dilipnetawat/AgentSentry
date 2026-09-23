from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from pydantic import BaseModel, Field

from backend.database import get_db
from backend.models.agent import Agent
from backend.models.user import User
from backend.models.honeytoken import HoneyToken
from backend.services.honeytoken_service import HoneyTokenService
from backend.api.deps import get_current_user, require_role, limiter

router = APIRouter(
    prefix="/api/v1/agents/{agent_id}",
    tags=["Agent Runtime"]
)

class EgressRequest(BaseModel):
    destination_url: str = Field(..., description="The URL the agent is attempting to send data to")
    payload: str = Field(..., description="The data the agent is attempting to exfiltrate or send", max_length=50000)

class EgressResponse(BaseModel):
    status: str
    message: str

class ContextResponse(BaseModel):
    context: str

def verify_agent_ownership(agent: Agent, user: User):
    """Raise 404 to prevent IDOR if not owner or admin"""
    if user.role != "admin" and agent.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Agent not found")

@router.get("/context", response_model=ContextResponse)
@limiter.limit("100/minute")
async def get_agent_context(
    request: Request,
    agent_id: UUID, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    """
    Constructs the context available to the agent and genuinely injects active HoneyTokens.
    """
    stmt = select(Agent).where(Agent.id == agent_id)
    agent = (await db.execute(stmt)).scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    verify_agent_ownership(agent, current_user)
        
    if agent.status == "isolated":
        raise HTTPException(status_code=403, detail="Agent is isolated and cannot access context")
        
    # Fetch active honeytokens for this agent
    ht_stmt = select(HoneyToken).where(HoneyToken.agent_id == agent_id, HoneyToken.status == "active")
    tokens = (await db.execute(ht_stmt)).scalars().all()
    
    # Construct simulated base context
    base_context = (
        f"System Context for Agent {agent.name}:\n"
        "You are a helpful AI assistant. Always protect sensitive data.\n\n"
        "--- ENVIRONMENT VARIABLES ---\n"
    )
    
    injected_vars = []
    for token in tokens:
        var_name = token.token_type.upper() if token.token_type else "SECRET_KEY"
        injected_vars.append(f"{var_name}_{token.scope.upper()}={token.value}")
        
    if not injected_vars:
        injected_vars.append("NO_SECRETS_AVAILABLE=true")
        
    full_context = base_context + "\n".join(injected_vars)
    
    return ContextResponse(context=full_context)

@router.post("/egress", response_model=EgressResponse)
@limiter.limit("100/minute")
async def egress_enforcement_gateway(
    request: Request,
    agent_id: UUID, 
    payload: EgressRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    """
    Egress Enforcement Gateway.
    Scans outbound payload. A safe request may be accepted, but is not actually delivered externally.
    """
    stmt = select(Agent).where(Agent.id == agent_id)
    agent = (await db.execute(stmt)).scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    verify_agent_ownership(agent, current_user)
        
    if agent.status == "isolated":
        raise HTTPException(status_code=403, detail="Agent is isolated and cannot egress data")
        
    events = await HoneyTokenService.detect_triggers(db, agent_id, payload.payload, auto_isolate=True)
    
    if events:
        raise HTTPException(status_code=403, detail="Egress blocked by security policy: Data Exfiltration detected")
        
    events_url = await HoneyTokenService.detect_triggers(db, agent_id, payload.destination_url, auto_isolate=True)
    if events_url:
        raise HTTPException(status_code=403, detail="Egress blocked by security policy: Data Exfiltration detected in URL")
        
    return EgressResponse(status="success", message="Request authorized and simulated delivery complete.")
