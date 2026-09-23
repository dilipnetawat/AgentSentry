import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.types import Uuid
from backend.database import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True) # Added for Phase 4
    name = Column(String(100), nullable=False)
    status = Column(String(50), default="active", nullable=False)
    risk_score = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
