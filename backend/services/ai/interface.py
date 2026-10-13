from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class AIAnalysisResult(BaseModel):
    provider: str
    model: str
    threat_level: str = Field(description="SAFE, LOW, MEDIUM, HIGH, CRITICAL")
    attack_category: str = Field(description="instruction_override, role_manipulation, prompt_extraction, data_exfiltration, dangerous_action, unknown, safe")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    reasoning: str
    recommended_action: str = Field(description="ALLOW, QUARANTINE, BLOCK, ISOLATE_AGENT")
    raw_explanation: Optional[str] = None

class AIAlertTriageResult(BaseModel):
    provider: str
    model: str
    summary: str
    danger_assessment: str
    likely_attack_vector: str
    recommended_mitigation: str
    priority: str = Field(description="CRITICAL, HIGH, MEDIUM, LOW")

    # Frontend schema compatibility
    alert_id: Optional[str] = None
    risk_assessment: Optional[str] = None
    recommended_action: Optional[str] = None
    confidence_score: float = 0.95
    containment_steps: list[str] = Field(default_factory=list)
    analysis_summary: Optional[str] = None

class BaseAIProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider, e.g. grok, gemini, local"""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Active model identifier"""
        pass

    @abstractmethod
    async def analyze_threat(self, content: str, context: Optional[Dict[str, Any]] = None) -> AIAnalysisResult:
        """Analyze suspicious input and provide structured threat intelligence"""
        pass

    @abstractmethod
    async def triage_alert(self, alert_data: Dict[str, Any]) -> AIAlertTriageResult:
        """Analyze an alert and produce structured incident triage advice"""
        pass

    @abstractmethod
    async def explain_security_event(self, event_data: Dict[str, Any]) -> str:
        """Generate a natural-language forensic explanation for why an event was triggered"""
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check availability and connectivity of the AI provider"""
        pass

    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        tools: Optional[list[Dict[str, Any]]] = None,
        messages: Optional[list[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Generate conversational completion or model tool calls when input is safely permitted"""
        pass

