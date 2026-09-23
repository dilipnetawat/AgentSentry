import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.types import Uuid
from backend.database import Base

class IngestionRecord(Base):
    __tablename__ = "ingestion_records"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    agent_id = Column(Uuid(as_uuid=True), ForeignKey("agents.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)
    provenance = Column(JSON, nullable=True)
    
    # We do not store the full 'content' here by default to avoid logging sensitive data, 
    # but we store the metadata of the ingestion request.
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
