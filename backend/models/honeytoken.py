import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.types import Uuid
from backend.database import Base

class HoneyToken(Base):
    __tablename__ = "honeytokens"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    agent_id = Column(Uuid(as_uuid=True), ForeignKey("agents.id"), nullable=False, index=True)
    value = Column(String(255), nullable=False, unique=True, index=True) # The decoy value itself
    scope = Column(String(50), nullable=False) # e.g., 'system_prompt', 'database_record'
    token_type = Column(String(50), nullable=False, default="api_key") # e.g., api_key, email
    status = Column(String(50), nullable=False, default="active") # active, revoked
    is_triggered = Column(Boolean, default=False, nullable=False) # Legacy compat
    trigger_count = Column(Integer, default=0, nullable=False)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
