from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.database import get_db
from backend.models.agent import Agent
from backend.models.honeytoken import HoneyToken
from backend.schemas.honeytoken import HoneyTokenRequest, HoneyTokenResponse
from backend.services.honeytoken_service import HoneyTokenService
from backend.api.deps import require_role
from backend.models.user import User

router = APIRouter(
    prefix="/api/v1/honeytokens",
    tags=["honeytokens"]
)

async def _verify_agent_access(db: AsyncSession, agent_id, user: User) -> Agent:
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found. Cannot attach HoneyToken."
        )
    if user.role != "admin" and agent.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found. Cannot attach HoneyToken."
        )
    return agent

@router.post("", response_model=HoneyTokenResponse, status_code=status.HTTP_201_CREATED)
async def create_honeytoken(
    request: HoneyTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Generate a new secure HoneyToken for a specific agent.
    Requires Admin role.
    """
    await _verify_agent_access(db, request.agent_id, current_user)

    token = await HoneyTokenService.create_honeytoken(
        db=db, 
        agent_id=request.agent_id, 
        scope=request.scope,
        token_type=request.token_type if hasattr(request, 'token_type') else "api_key"
    )
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Agent not found. Cannot attach HoneyToken."
        )
        
    return token

@router.get("", response_model=list[HoneyTokenResponse])
async def list_honeytokens(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    """
    List all HoneyTokens (redacted). Admins see all, analysts see their own agents' tokens.
    """
    stmt = select(HoneyToken).join(Agent, HoneyToken.agent_id == Agent.id).order_by(HoneyToken.created_at.desc())
    if current_user.role != "admin":
        stmt = stmt.where(Agent.owner_id == current_user.id)

    tokens = (await db.execute(stmt)).scalars().all()
    
    result = []
    for token in tokens:
        result.append({
            "id": token.id,
            "agent_id": token.agent_id,
            "scope": token.scope,
            "token_type": token.token_type,
            "value": "REDACTED_TOKEN_VALUE",
            "status": token.status,
            "is_triggered": token.is_triggered,
            "trigger_count": token.trigger_count,
            "last_triggered_at": token.last_triggered_at,
            "created_at": token.created_at
        })
    return result

@router.post("/rotate", response_model=HoneyTokenResponse, status_code=status.HTTP_201_CREATED)
async def rotate_honeytoken(
    request: HoneyTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """
    Rotate an agent's HoneyToken for a given scope. Revokes old token and generates a new one.
    Requires Admin role.
    """
    await _verify_agent_access(db, request.agent_id, current_user)

    token = await HoneyTokenService.rotate_honeytoken(
        db=db,
        agent_id=request.agent_id,
        scope=request.scope,
        token_type=request.token_type if hasattr(request, 'token_type') else "api_key"
    )
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Agent not found. Cannot rotate HoneyToken."
        )
        
    return token
