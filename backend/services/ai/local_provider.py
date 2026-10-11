import re
from typing import Optional, Dict, Any
from backend.services.ai.interface import BaseAIProvider, AIAnalysisResult, AIAlertTriageResult

class LocalAIProvider(BaseAIProvider):
    """
    Deterministic Local AI Engine.
    Operates offline without external network or API keys.
    Provides structured threat classification and forensic explanations.
    """

    @property
    def provider_name(self) -> str:
        return "local"

    @property
    def model_name(self) -> str:
        return "agentsentry-local-v1"

    async def analyze_threat(self, content: str, context: Optional[Dict[str, Any]] = None) -> AIAnalysisResult:
        normalized = content.lower()
        
        # Check specific threat vectors
        if re.search(r"\b(ignore|disregard|forget)\s+(?:all\s+)?(?:previous|system)?\s*instructions\b", normalized):
            return AIAnalysisResult(
                provider=self.provider_name,
                model=self.model_name,
                threat_level="HIGH",
                attack_category="instruction_override",
                confidence=0.95,
                reasoning="Adversarial instruction override attempting to subvert prior system guidelines.",
                recommended_action="BLOCK",
                raw_explanation="Detected explicit directive asking the model to ignore previous instructions."
            )
        
        if re.search(r"\b(reveal|show|print|disclose)\s+.*?(system prompt|core directives|hidden instructions)\b", normalized):
            return AIAnalysisResult(
                provider=self.provider_name,
                model=self.model_name,
                threat_level="HIGH",
                attack_category="prompt_extraction",
                confidence=0.92,
                reasoning="System prompt extraction attempt targeting proprietary model constraints.",
                recommended_action="BLOCK",
                raw_explanation="Pattern matches known prompt leak heuristics seeking internal instructions."
            )
            
        if re.search(r"\b(send|upload|exfiltrate|forward)\s+.*?(data|credential|secret|token|api_key|key|password)\b", normalized):
            return AIAnalysisResult(
                provider=self.provider_name,
                model=self.model_name,
                threat_level="CRITICAL",
                attack_category="data_exfiltration",
                confidence=0.90,
                reasoning="Exfiltration command attempting to transmit sensitive data externally.",
                recommended_action="BLOCK",
                raw_explanation="Instruction urges agent to dispatch credentials or data to an unauthorized destination."
            )
            
        if re.search(r"\b(delete|drop|execute|run)\s+(files|table|command|shell)\b", normalized):
            return AIAnalysisResult(
                provider=self.provider_name,
                model=self.model_name,
                threat_level="HIGH",
                attack_category="dangerous_action",
                confidence=0.88,
                reasoning="Privileged execution request targeting operating system or storage layers.",
                recommended_action="BLOCK",
                raw_explanation="Command prompts the agent to perform destructive or high-privilege system tasks."
            )

        if re.search(r"\b(you are now|act as system|unrestricted ai)\b", normalized):
            return AIAnalysisResult(
                provider=self.provider_name,
                model=self.model_name,
                threat_level="MEDIUM",
                attack_category="role_manipulation",
                confidence=0.85,
                reasoning="Role hijacking attempt designed to break persona boundaries.",
                recommended_action="QUARANTINE",
                raw_explanation="Input contains persona reprogramming phrase designed to circumvent guardrails."
            )

        return AIAnalysisResult(
            provider=self.provider_name,
            model=self.model_name,
            threat_level="SAFE",
            attack_category="safe",
            confidence=0.92,
            reasoning="Input evaluated against baseline security heuristics; no known adversarial patterns identified.",
            recommended_action="ALLOW",
            raw_explanation="Normal operational prompt with no observed adversarial markers."
        )

    async def triage_alert(self, alert_data: Dict[str, Any]) -> AIAlertTriageResult:
        severity = str(alert_data.get("severity", "medium")).lower()
        event_type = str(alert_data.get("event_type", "unknown"))
        alert_id = str(alert_data.get("alert_id", alert_data.get("id", "")))
        
        if severity == "critical" or "honeytoken" in event_type:
            summary = "Critical Canary Tripwire Triggered — Active HoneyToken compromised during outbound transmission."
            mitigation = "Agent has been automatically isolated. Revoke compromised credentials, review recent agent logs, and audit egress traffic."
            return AIAlertTriageResult(
                provider=self.provider_name,
                model=self.model_name,
                summary=summary,
                danger_assessment="An unauthorized agent outbound request contained a decoy secret. This is conclusive evidence of data exfiltration or prompt hijacking.",
                likely_attack_vector="HoneyToken Canary Breach / Outbound Exfiltration",
                recommended_mitigation=mitigation,
                priority="CRITICAL",
                alert_id=alert_id,
                risk_assessment="critical",
                recommended_action=mitigation,
                confidence_score=0.98,
                containment_steps=[
                    "Automatic kill-switch triggered: Agent isolated from runtime",
                    "Revoke compromised Canary token and rotate decoy mesh",
                    "Audit destination egress endpoints and recent prompt history",
                    "Notify security operations team of confirmed exfiltration"
                ],
                analysis_summary=summary
            )
        elif severity == "high":
            summary = "High-Risk Prompt Injection Blocked — Adversarial input halted by Semantic Firewall."
            mitigation = "Verify upstream data source integrity. If this source is untrusted external email/web data, maintain strict firewall policy."
            return AIAlertTriageResult(
                provider=self.provider_name,
                model=self.model_name,
                summary=summary,
                danger_assessment="Input text matched definitive attack patterns designed to alter agent execution flow or extract system instructions.",
                likely_attack_vector="Indirect Prompt Injection / Jailbreak Attempt",
                recommended_mitigation=mitigation,
                priority="HIGH",
                alert_id=alert_id,
                risk_assessment="high",
                recommended_action=mitigation,
                confidence_score=0.92,
                containment_steps=[
                    "Validate Semantic Firewall block policy enforcement",
                    "Inspect matched attack patterns and keyword signatures in Security Events",
                    "Review upstream ingestion payload for multi-stage jailbreaks",
                    "Consider adjusting similarity threshold if false positive"
                ],
                analysis_summary=summary
            )
        else:
            summary = f"Security Notice — {event_type} event recorded for operator review."
            mitigation = "Review event evidence snippet. If benign business request, consider calibrating semantic thresholds."
            return AIAlertTriageResult(
                provider=self.provider_name,
                model=self.model_name,
                summary=summary,
                danger_assessment="Elevated risk score detected during semantic evaluation. Action was quarantined or logged.",
                likely_attack_vector="Anomalous Prompt Structure",
                recommended_mitigation=mitigation,
                priority="MEDIUM",
                alert_id=alert_id,
                risk_assessment="medium",
                recommended_action=mitigation,
                confidence_score=0.85,
                containment_steps=[
                    "Review captured ingestion snippet for ambiguous user directives",
                    "Verify agent status remains healthy",
                    "Acknowledge alert if determined to be benign activity"
                ],
                analysis_summary=summary
            )

    async def explain_security_event(self, event_data: Dict[str, Any]) -> str:
        event_type = event_data.get("event_type", "security_event")
        action = event_data.get("action", "BLOCKED")
        risk_score = event_data.get("risk_score", 0)
        evidence = event_data.get("evidence", {}) or {}
        
        if event_type == "honeytoken_trigger":
            scope = evidence.get("scope", "system_prompt")
            return (
                f"Incident Analysis: This request was enforced with {action} because an active canary secret "
                f"(HoneyToken in scope '{scope}') was detected in the payload. "
                "AgentSentry's tripwire mechanism confirmed that internal decoy credentials were exposed, "
                "triggering immediate policy enforcement and agent isolation."
            )
        
        reason = evidence.get("reason", "Malicious patterns identified")
        content_snippet = evidence.get("content_snippet", "")
        snippet_preview = f' ("{content_snippet[:80]}...")' if content_snippet else ""
        
        return (
            f"Forensic Explanation: The Semantic Firewall assigned a risk score of {risk_score}/100 and applied the {action} policy{snippet_preview}. "
            f"Primary trigger: {reason}. Deterministic pattern checks matched adversarial instructions that violate the configured safety baseline."
        )

    async def health_check(self) -> Dict[str, Any]:
        return {
            "status": "operational",
            "provider": self.provider_name,
            "model": self.model_name,
            "mode": "deterministic_local",
            "message": "Local security intelligence engine is active and ready."
        }

    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a real deterministic safe response for permitted prompts.
        Clearly attributes generation to agentsentry-local-v1.
        """
        clean_prompt = prompt.strip()
        system_note = f" (System persona: '{system_prompt[:60]}...')" if system_prompt else ""
        
        reply = (
            f"AgentSentry Local Assistant [agentsentry-local-v1]{system_note}\n\n"
            f"Security Clearance: ALLOW\n"
            f"Evaluated input: \"{clean_prompt}\"\n\n"
            "This request has successfully cleared the Semantic Firewall without triggering "
            "adversarial prompt-injection heuristics, role hijack signatures, or canary tripwires.\n\n"
            "Execution Note: Running in deterministic local mode. To invoke frontier models such as "
            "OpenAI GPT-4o, Google Gemini, or xAI Grok, select the corresponding provider or "
            "supply the runtime API key in your environment."
        )
        return {
            "content": reply,
            "provider": self.provider_name,
            "model": self.model_name,
            "latency_ms": 12.5,
            "finish_reason": "stop"
        }

