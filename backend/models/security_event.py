import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.types import Uuid
from backend.database import Base

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    agent_id = Column(Uuid(as_uuid=True), ForeignKey("agents.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    source = Column(String(100), nullable=False)
    risk_score = Column(Integer, nullable=False)
    evidence = Column(JSON, nullable=True)
    action = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
