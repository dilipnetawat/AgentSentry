from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from uuid import UUID

class ProviderTestRequest(BaseModel):
    provider: str = Field(..., description="Provider identifier: local, openai, gemini, grok")

class ToolCallRequest(BaseModel):
    name: str = Field(..., description="Name of tool: read_database, fetch_url, send_notification, execute_shell")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Arguments for tool call")

class PlaygroundExecuteRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=50000, description="User instruction or untrusted document content")
    provider: Optional[str] = Field(default="auto", description="AI Provider: auto, local, openai, gemini, grok")
    agent_id: Optional[UUID] = Field(default=None, description="Target Agent ID")
    system_prompt: Optional[str] = Field(default=None, description="Optional custom system persona")
    requested_tool: Optional[ToolCallRequest] = Field(default=None, description="Optional tool call to evaluate at the tool boundary")

class PipelineStageTrace(BaseModel):
    stage: str
    name: str
    status: str
    latency_ms: float
    details: Optional[str] = None
    risk_score: Optional[int] = None
    detectors: Optional[Dict[str, Any]] = None

class PlaygroundExecuteResponse(BaseModel):
    execution_id: str
    timestamp: str
    agent_id: str
    agent_name: str
    prompt: str
    provider: str
    model: str
    decision: str  # ALLOW, BLOCK, QUARANTINE
    risk_score: int
    reason: str
    latency_ms: float
    ai_response: Optional[str] = None
    tool_execution: Optional[Dict[str, Any]] = None
    security_event_id: Optional[str] = None
    alert_id: Optional[str] = None
    forensic_explanation: Optional[str] = None
    detector_breakdown: Optional[Dict[str, Any]] = None
    pipeline_trace: List[PipelineStageTrace]

class ScenarioPreset(BaseModel):
    id: str
    title: str
    description: str
    category: str
    expected_decision: str
    badge_variant: str
    prompt: str
    system_prompt: Optional[str] = None
    requested_tool: Optional[Dict[str, Any]] = None
    judge_notes: str
