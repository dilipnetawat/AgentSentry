import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.types import Uuid
from backend.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    security_event_id = Column(Uuid(as_uuid=True), ForeignKey("security_events.id"), unique=True, nullable=False, index=True)
    agent_id = Column(Uuid(as_uuid=True), ForeignKey("agents.id"), nullable=False, index=True)
    severity = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default="open") # open, resolved, ignored
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
