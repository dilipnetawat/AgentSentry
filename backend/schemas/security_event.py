from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class SecurityEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    agent_id: UUID
    event_type: str
    severity: str
    source: str
    risk_score: int
    evidence: Optional[Dict[str, Any]] = None
    action: str
    created_at: datetime
