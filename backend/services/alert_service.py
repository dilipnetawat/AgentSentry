import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.models.security_event import SecurityEvent
from backend.models.alert import Alert

logger = logging.getLogger(__name__)

class AlertService:
    @staticmethod
    async def generate_alert_from_event(db: AsyncSession, event: SecurityEvent) -> Optional[Alert]:
        """
        Creates an actionable Alert from an immutable SecurityEvent.
        Generates alerts for critical, high, and medium severity events.
        Does NOT commit the transaction - relies on the caller to commit.
        """
        severity = event.severity.lower()
        if severity not in ["critical", "high", "medium"]:
            return None
            
        # Prevent uncontrolled duplicate alerts for the same SecurityEvent
        stmt = select(Alert).where(Alert.security_event_id == event.id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            logger.info(f"Alert already exists for SecurityEvent {event.id}")
            return None

        alert = Alert(
            security_event_id=event.id,
            agent_id=event.agent_id,
            severity=severity,
            status="open"
        )
        db.add(alert)
        logger.info(f"Generated {severity.upper()} alert for SecurityEvent {event.id}")
        return alert
