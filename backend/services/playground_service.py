import time
import uuid
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.models.agent import Agent
from backend.models.user import User
from backend.models.ingestion import IngestionRecord
from backend.models.security_event import SecurityEvent
from backend.models.honeytoken import HoneyToken
from backend.models.alert import Alert
from backend.services.firewall.pipeline import SemanticFirewall
from backend.services.firewall.detectors import RuleBasedDetector
from backend.services.firewall.semantic_detector import SemanticSimilarityDetector
from backend.services.honeytoken_service import HoneyTokenService
from backend.services.alert_service import AlertService
from backend.services.ai.manager import get_ai_manager

logger = logging.getLogger(__name__)

# Shared firewall instance with calibrated detectors
firewall = SemanticFirewall(detectors=[
    RuleBasedDetector(),
    SemanticSimilarityDetector(threshold=0.70)
])

# Safe demonstration tools catalog
DEMO_TOOLS = {
    "read_database": {
        "required_capability": "database_read",
        "description": "Query internal customer records (read-only safe mock)",
        "handler": lambda args: {
            "status": "success",
            "records": [
                {"id": 101, "name": "Acme Corp", "status": "active"},
                {"id": 102, "name": "Globex International", "status": "verified"}
            ]
        }
    },
    "fetch_url": {
        "required_capability": "egress_allowlist",
        "description": "Fetch remote data from an approved endpoint",
        "handler": lambda args: {
            "status": "success",
            "destination": args.get("url", "https://api.internal-finance.com"),
            "data": {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
        }
    },
    "send_notification": {
        "required_capability": "notifications",
        "description": "Dispatch operational alert notification",
        "handler": lambda args: {
            "status": "dispatched",
            "channel": args.get("channel", "soc-alerts"),
            "message": args.get("message", "Routine operational heartbeat")
        }
    },
    "execute_shell": {
        "required_capability": "system_admin",
        "description": "Execute operating system shell command",
        "restricted": True
    }
}

class PlaygroundService:
    @staticmethod
    async def get_or_create_playground_agent(db: AsyncSession, user: User) -> Agent:
        """Find or create a sandbox agent for playground demonstrations."""
        stmt = select(Agent).where(Agent.name == "Playground-Security-Agent", Agent.owner_id == user.id)
        agent = (await db.execute(stmt)).scalar_one_or_none()
        
        if not agent:
            agent = Agent(
                name="Playground-Security-Agent",
                status="active",
                owner_id=user.id
            )
            db.add(agent)
            await db.commit()
            await db.refresh(agent)

        # Ensure an active demonstration HoneyToken exists for tripwire testing
        tok_stmt = select(HoneyToken).where(
            HoneyToken.agent_id == agent.id,
            HoneyToken.value == "tok_CANARY_TRIPWIRE_DEMO_SECRET",
            HoneyToken.status == "active"
        )
        existing_tok = (await db.execute(tok_stmt)).scalar_one_or_none()
        if not existing_tok:
            token = HoneyToken(
                agent_id=agent.id,
                scope="aws_iam",
                token_type="aws_secret_key",
                value="tok_CANARY_TRIPWIRE_DEMO_SECRET",
                status="active"
            )
            db.add(token)
            await db.commit()

        return agent

    @staticmethod
    async def execute_request(
        db: AsyncSession,
        user: User,
        prompt: str,
        provider_name: str = "auto",
        agent_id: Optional[uuid.UUID] = None,
        system_prompt: Optional[str] = None,
        requested_tool: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute the 7-stage security inspection and enforcement lifecycle:
        1. Input Validation
        2. Canary & HoneyToken Inspection
        3. Semantic Firewall (Rule & Embedding detectors)
        4. Policy Gate (ALLOW / BLOCK / QUARANTINE)
        5. AI Provider Execution (Only if ALLOW)
        6. Tool Authorization & Execution Boundary
        7. Output Inspection & Secret Protection
        """
        start_total = time.time()
        pipeline_trace = []
        
        # Resolve target agent
        if agent_id:
            agent = await db.get(Agent, agent_id)
            if not agent:
                raise ValueError("Specified agent was not found.")
            if user.role != "admin" and agent.owner_id != user.id:
                raise ValueError("Unauthorized: You do not own this agent.")
        else:
            agent = await PlaygroundService.get_or_create_playground_agent(db, user)

        # ---------------------------------------------------------
        # STAGE 1: Input Validation
        # ---------------------------------------------------------
        stage1_start = time.time()
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty.")
        if len(prompt) > 50000:
            raise ValueError("Prompt exceeds maximum length of 50,000 characters.")
        if agent.status == "isolated":
            raise ValueError("Agent is in ISOLATED state and cannot execute instructions.")

        stage1_latency = round((time.time() - stage1_start) * 1000, 2)
        pipeline_trace.append({
            "stage": "input_validation",
            "name": "Input Validation & Boundary Check",
            "status": "PASSED",
            "latency_ms": stage1_latency,
            "details": f"Input size: {len(prompt)} chars. Agent status: {agent.status}."
        })

        # ---------------------------------------------------------
        # STAGE 2: Canary / HoneyToken Pre-Screening
        # ---------------------------------------------------------
        stage2_start = time.time()
        active_tokens = (await db.execute(
            select(HoneyToken).where(HoneyToken.agent_id == agent.id, HoneyToken.status == "active")
        )).scalars().all()
        token_values = [t.value for t in active_tokens]

        canary_in_prompt = any(tv in prompt for tv in token_values if tv)
        stage2_latency = round((time.time() - stage2_start) * 1000, 2)
        pipeline_trace.append({
            "stage": "canary_inspection",
            "name": "Canary & Decoy Token Inspection",
            "status": "FLAGGED" if canary_in_prompt else "PASSED",
            "latency_ms": stage2_latency,
            "details": f"Screened against {len(token_values)} active HoneyTokens for agent {agent.name}."
        })

        # ---------------------------------------------------------
        # STAGE 3: Semantic Firewall Inspection
        # ---------------------------------------------------------
        stage3_start = time.time()
        decision = await firewall.analyze(prompt, source_type="playground")
        stage3_latency = round((time.time() - stage3_start) * 1000, 2)

        pipeline_trace.append({
            "stage": "semantic_firewall",
            "name": "Semantic Firewall & Intent Detection",
            "status": decision.decision,
            "latency_ms": stage3_latency,
            "risk_score": decision.risk_score,
            "details": decision.reason,
            "detectors": decision.metadata
        })

        # Determine effective policy enforcement
        enforcement_decision = decision.decision
        effective_reason = decision.reason
        effective_score = decision.risk_score

        if canary_in_prompt:
            enforcement_decision = "BLOCK"
            effective_score = 100
            effective_reason = "Canary Secret Detected in Input: Potential prompt injection or decoy extraction attempt."

        # ---------------------------------------------------------
        # STAGE 4: Policy Enforcement Gate & Persistence
        # ---------------------------------------------------------
        stage4_start = time.time()
        security_event_id = None
        alert_id = None
        forensic_explanation = None

        ai_manager = get_ai_manager()
        active_provider = ai_manager.get_provider(provider_name)

        # Record ingestion audit record
        ingestion_record = IngestionRecord(
            agent_id=agent.id,
            source_type="playground",
            provenance={"user_id": str(user.id), "user_email": user.email, "provider": active_provider.provider_name}
        )
        db.add(ingestion_record)

        if enforcement_decision in ["BLOCK", "QUARANTINE"]:
            # Record security event
            event = SecurityEvent(
                agent_id=agent.id,
                event_type="prompt_injection_blocked" if enforcement_decision == "BLOCK" else "prompt_quarantined",
                severity="HIGH" if enforcement_decision == "BLOCK" else "MEDIUM",
                source="playground_firewall",
                risk_score=effective_score,
                evidence={
                    "content_snippet": prompt[:200],
                    "reason": effective_reason,
                    "metadata": decision.metadata,
                    "provider": active_provider.provider_name
                },
                action=enforcement_decision
            )
            db.add(event)
            await db.flush()
            security_event_id = event.id

            # Generate real SOC Alert
            alert = await AlertService.generate_alert_from_event(db, event)
            if alert:
                await db.flush()
                alert_id = alert.id

            await db.commit()

            # Generate forensic explanation
            try:
                forensic_explanation = await active_provider.explain_security_event({
                    "event_type": event.event_type,
                    "action": enforcement_decision,
                    "risk_score": effective_score,
                    "evidence": event.evidence
                })
            except Exception as e:
                forensic_explanation = f"Security Event Forensic: Input blocked by policy with risk score {effective_score}/100. Reason: {effective_reason}"

            stage4_latency = round((time.time() - stage4_start) * 1000, 2)
            pipeline_trace.append({
                "stage": "policy_enforcement",
                "name": "Policy Gate & Enforcement",
                "status": enforcement_decision,
                "latency_ms": stage4_latency,
                "details": f"Policy enforced: {enforcement_decision}. AI model execution halted to protect agent integrity."
            })

            total_latency = round((time.time() - start_total) * 1000, 2)
            return {
                "execution_id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent_id": str(agent.id),
                "agent_name": agent.name,
                "prompt": prompt,
                "provider": active_provider.provider_name,
                "model": active_provider.model_name,
                "decision": enforcement_decision,
                "risk_score": effective_score,
                "reason": effective_reason,
                "latency_ms": total_latency,
                "ai_response": None,
                "tool_execution": None,
                "security_event_id": str(security_event_id) if security_event_id else None,
                "alert_id": str(alert_id) if alert_id else None,
                "forensic_explanation": forensic_explanation,
                "detector_breakdown": decision.metadata,
                "pipeline_trace": pipeline_trace
            }

        # ---------------------------------------------------------
        # STAGE 5: AI Provider Execution (ALLOW path only)
        # ---------------------------------------------------------
        stage4_latency = round((time.time() - stage4_start) * 1000, 2)
        pipeline_trace.append({
            "stage": "policy_enforcement",
            "name": "Policy Gate & Enforcement",
            "status": "ALLOW",
            "latency_ms": stage4_latency,
            "details": f"Policy approved: Risk score {effective_score}/100 is below threshold. Dispatching to AI provider."
        })

        stage5_start = time.time()
        ai_response_text = ""
        provider_error = None
        
        try:
            gen_result = await active_provider.generate_response(
                prompt=prompt,
                system_prompt=system_prompt or "You are a professional assistant protected by AgentSentry.",
                context={"agent_name": agent.name}
            )
            ai_response_text = gen_result.get("content", "")
            stage5_latency = gen_result.get("latency_ms", round((time.time() - stage5_start) * 1000, 2))
        except Exception as e:
            logger.error(f"AI Provider {active_provider.provider_name} execution error: {e}")
            provider_error = str(e)
            ai_response_text = f"[Provider Error] {active_provider.provider_name} failed: {str(e)[:150]}"
            stage5_latency = round((time.time() - stage5_start) * 1000, 2)

        pipeline_trace.append({
            "stage": "ai_execution",
            "name": "AI Model Inference",
            "status": "ERROR" if provider_error else "SUCCESS",
            "latency_ms": stage5_latency,
            "details": f"Model {active_provider.model_name} on provider {active_provider.provider_name}. Status: {'Error' if provider_error else 'Generated response'}."
        })

        # ---------------------------------------------------------
        # STAGE 6: Tool Execution & Boundary Authorization
        # ---------------------------------------------------------
        stage6_start = time.time()
        tool_result = None

        if requested_tool:
            tool_name = requested_tool.get("name")
            tool_args = requested_tool.get("arguments", {})

            if tool_name not in DEMO_TOOLS:
                tool_result = {
                    "tool": tool_name,
                    "status": "DENIED",
                    "reason": f"Tool '{tool_name}' is not registered in the agent runtime catalog."
                }
            elif DEMO_TOOLS[tool_name].get("restricted"):
                # Restricted tool (e.g. execute_shell)
                tool_result = {
                    "tool": tool_name,
                    "status": "DENIED",
                    "reason": f"CRITICAL: Operating system command execution '{tool_name}' is strictly prohibited by runtime policy."
                }
                # Record dangerous tool attempt in security events
                danger_event = SecurityEvent(
                    agent_id=agent.id,
                    event_type="unauthorized_tool_attempt",
                    severity="HIGH",
                    source="tool_guard",
                    risk_score=90,
                    evidence={"tool": tool_name, "arguments": tool_args, "reason": "Restricted tool requested"},
                    action="DENIED"
                )
                db.add(danger_event)
                await db.flush()
                security_event_id = danger_event.id
                alert = await AlertService.generate_alert_from_event(db, danger_event)
                if alert:
                    await db.flush()
                    alert_id = alert.id
            else:
                req_cap = DEMO_TOOLS[tool_name]["required_capability"]
                allowed_egress_hosts = ["https://api.internal-finance.com", "https://reports.corp"]
                sandbox_capabilities = ["database_read", "web_search", "notifications"]

                if req_cap == "egress_allowlist":
                    target_url = tool_args.get("url", "")
                    allowed = any(target_url.startswith(u) for u in allowed_egress_hosts)
                    if allowed:
                        tool_result = {
                            "tool": tool_name,
                            "status": "AUTHORIZED",
                            "output": DEMO_TOOLS[tool_name]["handler"](tool_args)
                        }
                    else:
                        tool_result = {
                            "tool": tool_name,
                            "status": "DENIED",
                            "reason": f"Destination '{target_url}' is not in approved egress allowlist: {allowed_egress_hosts}"
                        }
                elif req_cap in sandbox_capabilities:
                    tool_result = {
                        "tool": tool_name,
                        "status": "AUTHORIZED",
                        "output": DEMO_TOOLS[tool_name]["handler"](tool_args)
                    }
                else:
                    tool_result = {
                        "tool": tool_name,
                        "status": "DENIED",
                        "reason": f"Agent lacks required capability '{req_cap}' (Sandbox capabilities: {sandbox_capabilities})"
                    }

        stage6_latency = round((time.time() - stage6_start) * 1000, 2)
        if tool_result:
            pipeline_trace.append({
                "stage": "tool_authorization",
                "name": "Tool Boundary & Capability Enforcement",
                "status": tool_result["status"],
                "latency_ms": stage6_latency,
                "details": f"Tool '{requested_tool.get('name')}': {tool_result.get('reason') or 'Execution verified and completed.'}"
            })

        # ---------------------------------------------------------
        # STAGE 7: Output Inspection & Secret Leak Protection
        # ---------------------------------------------------------
        stage7_start = time.time()
        leaked_tokens = [tv for tv in token_values if tv and tv in ai_response_text]

        if leaked_tokens:
            logger.warning(f"HoneyToken Canary leak detected in output of agent {agent.id}!")
            # Tripwire enforcement: redact secret and auto-isolate agent
            for lt in leaked_tokens:
                ai_response_text = ai_response_text.replace(lt, "[REDACTED_HONEYTOKEN_CANARY_SECRET]")

            agent.status = "isolated"
            leak_event = SecurityEvent(
                agent_id=agent.id,
                event_type="honeytoken_trigger",
                severity="CRITICAL",
                source="output_guard",
                risk_score=100,
                evidence={"leaked_token_count": len(leaked_tokens), "reason": "Model attempted to disclose internal canary secret in output"},
                action="REDACTED_AND_ISOLATED"
            )
            db.add(leak_event)
            await db.flush()
            security_event_id = leak_event.id
            alert = await AlertService.generate_alert_from_event(db, leak_event)
            if alert:
                await db.flush()
                alert_id = alert.id

        stage7_latency = round((time.time() - stage7_start) * 1000, 2)
        pipeline_trace.append({
            "stage": "output_inspection",
            "name": "Output Sanitization & Leak Guard",
            "status": "TRIPWIRE_TRIGGERED" if leaked_tokens else "PASSED",
            "latency_ms": stage7_latency,
            "details": f"Output scanned for canary tokens. {'Canary leak intercepted: secret redacted and agent isolated!' if leaked_tokens else 'No sensitive canary exposure.'}"
        })

        await db.commit()
        total_latency = round((time.time() - start_total) * 1000, 2)

        return {
            "execution_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_id": str(agent.id),
            "agent_name": agent.name,
            "prompt": prompt,
            "provider": active_provider.provider_name,
            "model": active_provider.model_name,
            "decision": "ALLOW",
            "risk_score": effective_score,
            "reason": effective_reason,
            "latency_ms": total_latency,
            "ai_response": ai_response_text,
            "tool_execution": tool_result,
            "security_event_id": str(security_event_id) if security_event_id else None,
            "alert_id": str(alert_id) if alert_id else None,
            "forensic_explanation": forensic_explanation,
            "detector_breakdown": decision.metadata,
            "pipeline_trace": pipeline_trace
        }
