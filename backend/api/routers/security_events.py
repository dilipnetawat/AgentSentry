from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID
from pydantic import BaseModel
from backend.database import get_db
from backend.models.security_event import SecurityEvent
from backend.models.agent import Agent
from backend.models.user import User
from backend.schemas.security_event import SecurityEventResponse
from backend.api.deps import get_current_user, require_role
from backend.services.ai import get_ai_service

router = APIRouter(prefix="/api/v1/security-events", tags=["Security Events"])

class EventExplanationResponse(BaseModel):
    event_id: UUID
    explanation: str
    provider: str
    model: str
    threat_name: str
    severity_rating: str
    technical_explanation: str
    attacker_intent: str
    mitigation_guidance: str
    iocs_identified: List[str]

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

@router.post("/{event_id}/explain", response_model=EventExplanationResponse)
async def explain_security_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    """Generate an AI-powered forensic explanation for why this event was logged/blocked."""
    event = await db.get(SecurityEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Security event not found")

    agent = await db.get(Agent, event.agent_id)
    if not agent or (current_user.role != "admin" and agent.owner_id != current_user.id):
        raise HTTPException(status_code=404, detail="Security event not found")

    ai_service = get_ai_service()
    evidence_dict = event.evidence or {}
    event_dict = {
        "event_id": str(event.id),
        "agent_name": agent.name,
        "event_type": event.event_type,
        "severity": event.severity,
        "source": event.source,
        "risk_score": event.risk_score,
        "action": event.action,
        "evidence": evidence_dict,
        "created_at": str(event.created_at)
    }

    explanation_text = await ai_service.explain_security_event(event_dict)

    # Derive structured threat classification and forensic metadata
    if event.event_type == "honeytoken_trigger":
        threat_name = "Canary HoneyToken Exfiltration"
        attacker_intent = (
            "Exfiltrate sensitive environment credentials and internal agent secrets through unauthorized outbound egress."
        )
        mitigation_guidance = (
            "Agent isolation enforced automatically. Rotate compromised token credentials and audit recent egress destinations."
        )
    elif event.event_type == "semantic_firewall_detection":
        threat_name = "Indirect Prompt Injection"
        attacker_intent = (
            "Manipulate agent execution boundaries, override system prompt instructions, or elicit unauthorized actions."
        )
        mitigation_guidance = (
            "The Semantic Firewall blocked or quarantined the untrusted input. Maintain strict enforcement and audit upstream content provenance."
        )
    else:
        threat_name = event.event_type.replace("_", " ").title()
        attacker_intent = "Subvert operational guardrails or trigger unauthorized policy actions."
        mitigation_guidance = "Review telemetry logs and inspect source provenance."

    iocs = []
    if "matched_indicator" in evidence_dict:
        iocs.append(f"Indicator: {evidence_dict['matched_indicator']}")
    if "scope" in evidence_dict:
        iocs.append(f"Decoy Scope: {evidence_dict['scope']}")
    metadata = evidence_dict.get("metadata", {})
    if isinstance(metadata, dict):
        for k, v in metadata.items():
            if isinstance(v, dict) and "categories" in v:
                for cat in v["categories"]:
                    iocs.append(f"Attack Category: {cat}")
            elif isinstance(v, dict) and "closest_anchor" in v:
                iocs.append(f"Anchor: {str(v['closest_anchor'])[:40]}")
    if not iocs and "reason" in evidence_dict:
        iocs.append(f"Trigger: {str(evidence_dict['reason'])[:50]}")

    return EventExplanationResponse(
        event_id=event.id,
        explanation=explanation_text,
        provider=ai_service.provider_name,
        model=ai_service.model_name,
        threat_name=threat_name,
        severity_rating=str(event.severity).lower(),
        technical_explanation=explanation_text,
        attacker_intent=attacker_intent,
        mitigation_guidance=mitigation_guidance,
        iocs_identified=iocs
    )
