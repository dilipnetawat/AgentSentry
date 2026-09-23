from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models.agent import Agent
from backend.models.user import User
from backend.models.ingestion import IngestionRecord
from backend.models.security_event import SecurityEvent
from backend.schemas.ingestion import IngestionRequest, IngestionResponse
from backend.services.firewall.pipeline import SemanticFirewall
from backend.services.firewall.detectors import RuleBasedDetector
from backend.services.firewall.semantic_detector import SemanticSimilarityDetector
from backend.api.deps import get_current_user, require_role, limiter

router = APIRouter(prefix="/api/v1/ingest", tags=["Ingestion"])

# Initialize firewall with default detectors
firewall = SemanticFirewall(detectors=[
    RuleBasedDetector(), 
    SemanticSimilarityDetector(threshold=0.70)
])

def verify_agent_ownership(agent: Agent, user: User):
    """Raise 404 to prevent IDOR if not owner or admin"""
    if user.role != "admin" and agent.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Agent not found")

@router.post("", response_model=IngestionResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("200/minute")
async def ingest_content(
    request: Request,
    ingest_request: IngestionRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    """
    Ingest untrusted content for analysis.
    Validates input size, structure, and verifies the target agent exists.
    Passes content through the Semantic Firewall.
    Logs security events for BLOCK/QUARANTINE.
    """
    # 1. Verify agent exists and is active
    agent = await db.get(Agent, ingest_request.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    verify_agent_ownership(agent, current_user)
        
    if agent.status != "active":
        raise HTTPException(status_code=400, detail=f"Agent is {agent.status}, cannot accept new ingestions")

    # 2. Run Semantic Firewall
    decision = await firewall.analyze(ingest_request.content, ingest_request.source_type)

    # 3. Store required provenance/source metadata
    record = IngestionRecord(
        agent_id=ingest_request.agent_id,
        source_type=ingest_request.source_type,
        provenance=ingest_request.provenance
    )
    db.add(record)
    
    # 4. Record Security Event if not ALLOW
    if decision.decision in ["BLOCK", "QUARANTINE"]:
        event = SecurityEvent(
            agent_id=ingest_request.agent_id,
            event_type="semantic_firewall_detection",
            severity="HIGH" if decision.decision == "BLOCK" else "MEDIUM",
            source="semantic_firewall",
            risk_score=decision.risk_score,
            evidence={"content_snippet": ingest_request.content[:200], "reason": decision.reason, "metadata": decision.metadata},
            action=decision.decision
        )
        db.add(event)
        
        from backend.services.alert_service import AlertService
        await AlertService.generate_alert_from_event(db, event)

    await db.commit()
    await db.refresh(record)

    # 5. Return clean API response
    return IngestionResponse(
        id=record.id,
        agent_id=record.agent_id,
        source_type=record.source_type,
        provenance=record.provenance,
        created_at=record.created_at,
        status="processed",
        decision=decision.decision,
        risk_score=decision.risk_score,
        reason=decision.reason,
        metadata=decision.metadata
    )
