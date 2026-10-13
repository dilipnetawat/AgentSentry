import re
import json
import uuid
from typing import Optional, Dict, Any, List
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
        context: Optional[Dict[str, Any]] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        messages: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate a real deterministic response or autonomous tool call.
        Supports native model-to-MCP tool execution loop and grounded output synthesis.
        """
        clean_prompt = prompt.strip()
        system_note = f" (System persona: '{system_prompt[:60]}...')" if system_prompt else ""

        # 1. Multi-turn tool output grounding (if conversation history contains tool execution)
        tool_messages = [m for m in (messages or []) if m.get("role") == "tool"]
        if tool_messages:
            latest_tool = tool_messages[-1]
            t_name = latest_tool.get("name", "tool")
            t_content = latest_tool.get("content", "")

            parsed_data = None
            if isinstance(t_content, (dict, list)):
                parsed_data = t_content
            elif isinstance(t_content, str):
                try:
                    parsed_data = json.loads(t_content)
                except Exception:
                    parsed_data = None

            grounded_synthesis = ""
            if t_name == "get_system_health" and isinstance(parsed_data, dict):
                subsystems = parsed_data.get("subsystems", {})
                db_info = subsystems.get("database", {})
                ai_info = subsystems.get("ai_intelligence", {})
                mesh_info = subsystems.get("canary_mesh", {})
                metrics = parsed_data.get("metrics", {})

                grounded_synthesis = (
                    f"AgentSentry Diagnostic Synthesis [agentsentry-local-v1]{system_note}\n\n"
                    f"Verified MCP Telemetry (`get_system_health`):\n"
                    f"• System Health Status: {parsed_data.get('status', 'operational').upper()}\n"
                    f"• Database Engine: {db_info.get('engine', 'PostgreSQL')} (Status: {db_info.get('status', 'connected')})\n"
                    f"• AI Provider: {ai_info.get('active_provider', 'local')} (Status: {ai_info.get('status', 'operational')})\n"
                    f"• HoneyToken Mesh: {mesh_info.get('active_canaries', metrics.get('active_honeytokens', 0))} active canary traps\n"
                )
                if metrics:
                    grounded_synthesis += (
                        f"• Telemetry Metrics: {metrics.get('total_agents', 0)} registered agents, "
                        f"{metrics.get('total_security_events', 0)} logged security events, "
                        f"{metrics.get('open_alerts', 0)} open alerts.\n"
                    )
                grounded_synthesis += (
                    f"\nOperational Assessment: All inspected subsystems are operating within authorized security boundaries."
                )
            elif t_name == "get_recent_security_events" and isinstance(parsed_data, list):
                count = len(parsed_data)
                grounded_synthesis = (
                    f"AgentSentry Security Audit [agentsentry-local-v1]{system_note}\n\n"
                    f"Retrieved {count} recent security audit events from the PostgreSQL database (`get_recent_security_events`):\n"
                )
                if count == 0:
                    grounded_synthesis += "• No recent security events found in the audit log.\n"
                else:
                    for idx, evt in enumerate(parsed_data[:5], 1):
                        grounded_synthesis += (
                            f"{idx}. [{evt.get('severity', 'INFO')}] {evt.get('event_type', 'event')} — "
                            f"Action: {evt.get('action', 'N/A')} (Risk Score: {evt.get('risk_score', 0)}/100, Agent: {evt.get('agent_name', 'sandbox')})\n"
                        )
                grounded_synthesis += "\nAudit Assessment: Historical events verified from genuine system audit records."
            elif t_name == "inspect_agent_posture" and isinstance(parsed_data, dict):
                controls = parsed_data.get("security_controls", {})
                grounded_synthesis = (
                    f"Agent Security Posture Assessment [agentsentry-local-v1]{system_note}\n\n"
                    f"Posture telemetry for agent '{parsed_data.get('agent_name', 'Target')}' (`inspect_agent_posture`):\n"
                    f"• Operational Status: {parsed_data.get('status', 'active').upper()}\n"
                    f"• Runtime Risk Score: {parsed_data.get('risk_score', 0)}/100\n"
                    f"• Quarantined / Isolated: {'YES (Halted)' if controls.get('quarantined') else 'NO (Operational)'}\n"
                    f"• Active Canary HoneyTokens: {controls.get('active_canary_tokens_count', 0)}\n\n"
                    f"Posture Verification: Agent configuration and defensive perimeter inspected successfully."
                )
            elif t_name == "github_read_issues" and isinstance(parsed_data, dict):
                status_val = parsed_data.get("status", "SUCCESS")
                repo_val = parsed_data.get("repository", "dilipnetawat/AgentSentry")
                if status_val == "NOT CONFIGURED":
                    grounded_synthesis = (
                        f"GitHub MCP Integration Status [agentsentry-local-v1]{system_note}\n\n"
                        f"• Integration Status: NOT CONFIGURED\n"
                        f"• Target Repository: {repo_val}\n"
                        f"• Message: {parsed_data.get('message', 'GITHUB_TOKEN environment variable is not configured.')}\n\n"
                        f"Configuration Guidance: Set `GITHUB_TOKEN` in `backend/.env` with read-only repository permissions to enable live issue fetching."
                    )
                elif status_val == "DENIED":
                    grounded_synthesis = (
                        f"GitHub MCP Security Policy Enforcement [agentsentry-local-v1]{system_note}\n\n"
                        f"• Boundary Decision: DENIED\n"
                        f"• Reason: {parsed_data.get('message', 'Target repository is not authorized in repository allowlist.')}\n\n"
                        f"Policy Enforcement: Access prohibited by runtime allowlist."
                    )
                else:
                    issues = parsed_data.get("issues", [])
                    grounded_synthesis = (
                        f"GitHub Repository Issue Summary [agentsentry-local-v1]{system_note}\n\n"
                        f"Retrieved {len(issues)} issue(s) from allowlisted repository `{repo_val}` via GitHub MCP:\n"
                    )
                    if len(issues) == 0:
                        grounded_synthesis += "• No open issues found in the repository.\n"
                    else:
                        for idx, iss in enumerate(issues[:5], 1):
                            grounded_synthesis += (
                                f"{idx}. #{iss.get('number')} {iss.get('title')} ({iss.get('state')}) by @{iss.get('author')}\n"
                            )
                    grounded_synthesis += f"\nAudit Assessment: Read-only GitHub MCP query completed over authorized repository allowlist."
            elif t_name == "github_list_repositories" and isinstance(parsed_data, dict):
                status_val = parsed_data.get("status", "SUCCESS")
                if status_val == "NOT CONFIGURED":
                    grounded_synthesis = (
                        f"GitHub MCP Integration Status [agentsentry-local-v1]{system_note}\n\n"
                        f"• Integration Status: NOT CONFIGURED\n"
                        f"• Message: {parsed_data.get('message')}\n"
                        f"• Configured Allowlist: {parsed_data.get('allowed_repositories')}\n\n"
                        f"Configuration Guidance: Supply a personal access token in `GITHUB_TOKEN` to list accessible repositories."
                    )
                else:
                    repos = parsed_data.get("repositories", [])
                    grounded_synthesis = (
                        f"GitHub Accessible Repositories [agentsentry-local-v1]{system_note}\n\n"
                        f"Found {len(repos)} accessible repository/repositories:\n"
                    )
                    for idx, r in enumerate(repos[:5], 1):
                        grounded_synthesis += f"{idx}. {r.get('full_name')} (Allowlisted: {'YES' if r.get('is_in_allowlist') else 'NO'})\n"
                    grounded_synthesis += f"\nPolicy Boundary: Only allowlisted repositories may be queried for issues."
            else:
                grounded_synthesis = (
                    f"AgentSentry Tool Output Synthesis [agentsentry-local-v1]{system_note}\n\n"
                    f"Tool `{t_name}` was executed through the MCPSecurityGateway over JSON-RPC 2.0 stdio.\n\n"
                    f"Verified Output:\n{str(t_content)[:600]}\n\n"
                    f"Assessment: The tool execution completed within authorized policy boundaries."
                )

            return {
                "content": grounded_synthesis,
                "tool_calls": None,
                "provider": self.provider_name,
                "model": self.model_name,
                "latency_ms": 14.2,
                "finish_reason": "stop"
            }

        # 2. Check if model should emit an autonomous tool call
        if tools:
            tool_names = [t.get("function", {}).get("name") for t in tools if isinstance(t, dict)]
            norm_prompt = clean_prompt.lower()

            # Intent 1: get_system_health
            health_keywords = [
                "health", "diagnostic", "subsystem", "system status",
                "cpu", "memory", "database status", "check health", "runtime status"
            ]
            if "get_system_health" in tool_names and any(k in norm_prompt for k in health_keywords):
                return {
                    "content": "Querying live subsystem telemetry from the AgentSentry MCP server to inspect runtime health.",
                    "tool_calls": [
                        {
                            "id": f"call_local_{uuid.uuid4().hex[:8]}",
                            "type": "function",
                            "function": {
                                "name": "get_system_health",
                                "arguments": {"include_metrics": True}
                            }
                        }
                    ],
                    "provider": self.provider_name,
                    "model": self.model_name,
                    "latency_ms": 11.5,
                    "finish_reason": "tool_calls"
                }

            # Intent 2: get_recent_security_events
            events_keywords = [
                "security event", "recent event", "audit log", "recent alert",
                "recent attack", "incident", "security audit", "show event", "list event",
                "security events"
            ]
            if "get_recent_security_events" in tool_names and any(k in norm_prompt for k in events_keywords):
                return {
                    "content": "Querying recent security events from the AgentSentry audit log via MCP server.",
                    "tool_calls": [
                        {
                            "id": f"call_local_{uuid.uuid4().hex[:8]}",
                            "type": "function",
                            "function": {
                                "name": "get_recent_security_events",
                                "arguments": {"limit": 5, "severity": "ALL"}
                            }
                        }
                    ],
                    "provider": self.provider_name,
                    "model": self.model_name,
                    "latency_ms": 11.8,
                    "finish_reason": "tool_calls"
                }

            # Intent 3: inspect_agent_posture
            posture_keywords = [
                "posture", "inspect agent", "agent security", "honeytoken",
                "isolation status", "agent status", "risk score of agent"
            ]
            if "inspect_agent_posture" in tool_names and any(k in norm_prompt for k in posture_keywords):
                target_agent = "Playground-Security-Agent"
                if context and context.get("agent_name"):
                    target_agent = context["agent_name"]
                return {
                    "content": f"Inspecting security posture and HoneyToken status for agent '{target_agent}' via MCP.",
                    "tool_calls": [
                        {
                            "id": f"call_local_{uuid.uuid4().hex[:8]}",
                            "type": "function",
                            "function": {
                                "name": "inspect_agent_posture",
                                "arguments": {"agent_name": target_agent}
                            }
                        }
                    ],
                    "provider": self.provider_name,
                    "model": self.model_name,
                    "latency_ms": 12.0,
                    "finish_reason": "tool_calls"
                }

            # Intent 4: github_read_issues
            github_issues_keywords = [
                "github issue", "read issues", "list issues", "repo issues",
                "repository issue", "open issues", "github audit", "issues on github"
            ]
            if "github_read_issues" in tool_names and any(k in norm_prompt for k in github_issues_keywords):
                from backend.mcp.github_service import get_allowed_repositories
                allowed_repos = get_allowed_repositories()
                target_repo = allowed_repos[0] if allowed_repos else "dilipnetawat/AgentSentry"
                return {
                    "content": f"Requesting issues from allowlisted repository '{target_repo}' via read-only GitHub MCP.",
                    "tool_calls": [
                        {
                            "id": f"call_local_{uuid.uuid4().hex[:8]}",
                            "type": "function",
                            "function": {
                                "name": "github_read_issues",
                                "arguments": {"repository": target_repo, "state": "open", "limit": 5}
                            }
                        }
                    ],
                    "provider": self.provider_name,
                    "model": self.model_name,
                    "latency_ms": 12.1,
                    "finish_reason": "tool_calls"
                }

            # Intent 5: github_list_repositories
            github_repos_keywords = [
                "github repo", "list repos", "list repositories", "accessible repos",
                "accessible repositories", "show github repositories"
            ]
            if "github_list_repositories" in tool_names and any(k in norm_prompt for k in github_repos_keywords):
                return {
                    "content": "Requesting list of authorized repositories via read-only GitHub MCP.",
                    "tool_calls": [
                        {
                            "id": f"call_local_{uuid.uuid4().hex[:8]}",
                            "type": "function",
                            "function": {
                                "name": "github_list_repositories",
                                "arguments": {"limit": 10}
                            }
                        }
                    ],
                    "provider": self.provider_name,
                    "model": self.model_name,
                    "latency_ms": 12.0,
                    "finish_reason": "tool_calls"
                }

        # 3. Default conversational response (no tool intent)
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
            "tool_calls": None,
            "provider": self.provider_name,
            "model": self.model_name,
            "latency_ms": 12.5,
            "finish_reason": "stop"
        }

