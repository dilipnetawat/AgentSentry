from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

AgentStatus = Literal["active", "isolated", "disabled"]

class AgentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the agent")
    status: AgentStatus = Field(default="active", description="Current status of the agent")
    risk_score: int = Field(default=0, ge=0, le=100, description="Risk score from 0 to 100")
    owner_id: Optional[UUID] = None

class AgentCreate(AgentBase):
    pass

class AgentResponse(AgentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    updated_at: datetime
