from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime

class HoneyTokenBase(BaseModel):
    agent_id: UUID = Field(..., description="Agent associated with this HoneyToken")
    scope: str = Field(..., max_length=50, description="The location/scope of the token (e.g. system_prompt)")
    token_type: str = Field(default="api_key", max_length=50, description="Format of the token")

class HoneyTokenRequest(HoneyTokenBase):
    pass

class HoneyTokenResponse(HoneyTokenBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    value: str = Field(..., description="The generated decoy value")
    status: str = Field(..., description="active or revoked")
    is_triggered: bool
    trigger_count: int
    last_triggered_at: datetime | None = None
    created_at: datetime
