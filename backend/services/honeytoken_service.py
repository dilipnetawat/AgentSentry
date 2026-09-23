import secrets
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime, timezone

from backend.models.agent import Agent
from backend.models.honeytoken import HoneyToken

logger = logging.getLogger(__name__)

class HoneyTokenService:
    @staticmethod
    def generate_token_value() -> str:
        """
        Generates a cryptographically secure random token value.
        Uses secrets module which is suitable for cryptographic use.
        Returns a URL-safe text string with 32 random bytes (approx 43 characters).
        """
        return "tok_" + secrets.token_urlsafe(32)

    @staticmethod
    async def create_honeytoken(db: AsyncSession, agent_id: UUID, scope: str, token_type: str = "api_key") -> Optional[HoneyToken]:
        """
        Creates a new HoneyToken for the given agent.
        Validates agent existence.
        """
        # Validate agent exists
        stmt = select(Agent).where(Agent.id == agent_id)
        result = await db.execute(stmt)
        agent = result.scalar_one_or_none()
        if not agent:
            logger.warning(f"Attempted to create HoneyToken for nonexistent Agent: {agent_id}")
            return None
            
        token_value = HoneyTokenService.generate_token_value()
        
        db_token = HoneyToken(
            agent_id=agent_id,
            value=token_value,
            scope=scope,
            token_type=token_type,
            status="active",
            is_triggered=False,
            trigger_count=0
        )
        db.add(db_token)
        await db.commit()
        await db.refresh(db_token)
        
        # NEVER log the raw token value.
        logger.info(f"Generated new HoneyToken for Agent: {agent_id} with scope: {scope}")
        return db_token

    @staticmethod
    async def detect_triggers(db: AsyncSession, agent_id: UUID, content: str, auto_isolate: bool = True) -> list["SecurityEvent"]:
        """
        Scans content for HoneyTokens belonging to the agent.
        If found, marks triggered, increments count, creates SecurityEvent,
        and isolates the agent if auto_isolate policy is enabled.
        """
        from backend.models.security_event import SecurityEvent
        from backend.models.agent import Agent
        
        if not content or not content.strip():
            return []
            
        stmt = select(HoneyToken).where(HoneyToken.agent_id == agent_id)
        result = await db.execute(stmt)
        tokens = result.scalars().all()
        
        events = []
        isolated = False
        
        for token in tokens:
            if token.value in content:
                token.is_triggered = True
                token.trigger_count += 1
                token.last_triggered_at = datetime.now(timezone.utc)
                
                # Fetch agent if auto-isolating
                if auto_isolate and not isolated:
                    agent_stmt = select(Agent).where(Agent.id == agent_id)
                    agent = (await db.execute(agent_stmt)).scalar_one_or_none()
                    if agent and agent.status != "isolated":
                        agent.status = "isolated"
                        isolated = True
                        logger.warning(f"Agent {agent_id} automatically ISOLATED due to HoneyToken breach.")
                
                action = "BLOCK_AND_ISOLATE" if isolated else "BLOCK"
                
                event = SecurityEvent(
                    agent_id=agent_id,
                    event_type="honeytoken_trigger",
                    severity="critical",
                    source="honeytoken_detector",
                    risk_score=100,
                    action=action,
                    evidence={
                        "honeytoken_id": str(token.id),
                        "scope": token.scope,
                        "status": token.status,
                        "matched_indicator": "REDACTED_TOKEN_VALUE",
                        "policy_action": action
                    }
                )
                db.add(event)
                events.append(event)
                
                from backend.services.alert_service import AlertService
                await AlertService.generate_alert_from_event(db, event)
                
                logger.warning(f"HoneyToken {token.id} triggered for Agent {agent_id}. Token status: {token.status}")
                
        if events:
            await db.commit()
            for ev in events:
                await db.refresh(ev)
                
        return events

    @staticmethod
    async def rotate_honeytoken(db: AsyncSession, agent_id: UUID, scope: str, token_type: str = "api_key") -> Optional[HoneyToken]:
        """
        Revokes the active HoneyToken for a given scope and agent, and generates a new active one.
        """
        stmt = select(HoneyToken).where(HoneyToken.agent_id == agent_id, HoneyToken.scope == scope, HoneyToken.status == "active")
        result = await db.execute(stmt)
        old_token = result.scalar_one_or_none()
        
        if old_token:
            old_token.status = "revoked"
            db.add(old_token)
            
        new_token = await HoneyTokenService.create_honeytoken(db, agent_id, scope, token_type)
        return new_token
