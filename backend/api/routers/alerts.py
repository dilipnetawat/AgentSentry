from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from backend.database import get_db
from backend.models.alert import Alert
from backend.models.agent import Agent
from backend.models.security_event import SecurityEvent
from backend.models.user import User
from backend.schemas.alert import AlertResponse, AlertStatusUpdate
from backend.api.deps import get_current_user, require_role
from backend.services.ai import get_ai_service, AIAlertTriageResult

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

@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert_status(
    alert_id: UUID,
    status_update: AlertStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    """Update alert resolution status (open, acknowledged, resolved, ignored)."""
    valid_statuses = ["open", "acknowledged", "resolved", "ignored"]
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{status_update.status}'. Allowed: {valid_statuses}"
        )

    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    agent = await db.get(Agent, alert.agent_id)
    if not agent or (current_user.role != "admin" and agent.owner_id != current_user.id):
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = status_update.status
    await db.commit()
    await db.refresh(alert)
    return alert

@router.post("/{alert_id}/triage", response_model=AIAlertTriageResult)
async def triage_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    """Run AI incident triage analysis on a specific alert."""
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    agent = await db.get(Agent, alert.agent_id)
    if not agent or (current_user.role != "admin" and agent.owner_id != current_user.id):
        raise HTTPException(status_code=404, detail="Alert not found")

    event = await db.get(SecurityEvent, alert.security_event_id)
    alert_data = {
        "alert_id": str(alert.id),
        "agent_name": agent.name,
        "severity": alert.severity,
        "status": alert.status,
        "event_type": event.event_type if event else "unknown",
        "action": event.action if event else "unknown",
        "risk_score": event.risk_score if event else 0,
        "evidence": event.evidence if event else {},
        "created_at": str(alert.created_at)
    }

    ai_service = get_ai_service()
    return await ai_service.triage_alert(alert_data)
