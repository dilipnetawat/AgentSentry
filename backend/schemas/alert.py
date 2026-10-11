from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    security_event_id: UUID
    agent_id: UUID
    severity: str
    status: str
    created_at: datetime

class AlertStatusUpdate(BaseModel):
    status: str
