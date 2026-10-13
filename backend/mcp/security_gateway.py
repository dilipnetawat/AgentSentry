"""
AgentSentry — MCP Security Policy Gateway
Enforces default-deny authorization, server & tool allowlists,
pre-execution parameter validation, canary detection, and audit persistence.
"""
import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.mcp.client import (
    AgentSentryMCPClient,
    MCPClientError,
    MCPConnectionError,
    MCPSchemaValidationError
)
from backend.models.agent import Agent
from backend.models.user import User
from backend.models.security_event import SecurityEvent
from backend.models.honeytoken import HoneyToken
from backend.services.alert_service import AlertService

logger = logging.getLogger(__name__)

# Configured server allowlist (strict default-deny)
ALLOWED_MCP_SERVERS = {
    "agentsentry-local": {
        "description": "AgentSentry Local Read-Only Security Diagnostics Server",
        "allowed_tools": {
            "get_system_health": {
                "capability": "system_health_read",
                "max_timeout": 5.0,
                "read_only": True
            },
            "get_recent_security_events": {
                "capability": "audit_log_read",
                "max_timeout": 5.0,
                "read_only": True
            },
            "inspect_agent_posture": {
                "capability": "agent_posture_read",
                "max_timeout": 5.0,
                "read_only": True
            },
            "github_list_repositories": {
                "capability": "github_read",
                "max_timeout": 6.0,
                "read_only": True
            },
            "github_read_issues": {
                "capability": "github_read",
                "max_timeout": 6.0,
                "read_only": True
            },
            "github_get_issue_detail": {
                "capability": "github_read",
                "max_timeout": 6.0,
                "read_only": True
            }
        }
    }
}

# Dangerous parameter patterns to block immediately
DISALLOWED_ARGUMENT_PATTERNS = [
    ";", "&&", "||", "`", "$(", "|",
    "rm -rf", "sh -c", "bash -c", "/bin/sh",
    "sudo", "eval(", "exec("
]

class MCPSecurityGateway:
    """
    Central security evaluation and dispatch gate for all MCP tool interactions.
    Treats all model-generated arguments and external tool outputs as untrusted.
    """

    def __init__(self, client: Optional[AgentSentryMCPClient] = None):
        self.client = client or AgentSentryMCPClient(server_name="agentsentry-local")

    async def list_available_tools(self) -> List[Dict[str, Any]]:
        """Discover tools from allowed servers and annotate with authorization status."""
        try:
            discovered = await self.client.list_tools()
            tools_manifest = []
            allowed_tools_config = ALLOWED_MCP_SERVERS.get(self.client.server_name, {}).get("allowed_tools", {})

            for t in discovered:
                is_authorized = t.name in allowed_tools_config
                tools_manifest.append({
                    "name": t.name,
                    "namespaced_name": f"{self.client.server_name}:{t.name}",
                    "server": self.client.server_name,
                    "description": t.description,
                    "input_schema": t.inputSchema.model_dump(),
                    "policy_status": "ALLOWED" if is_authorized else "RESTRICTED",
                    "capability_required": allowed_tools_config.get(t.name, {}).get("capability", "unspecified")
                })
            return tools_manifest
        except Exception as e:
            logger.error(f"Error listing MCP tools: {e}")
            return []

    async def get_model_tool_definitions(self) -> List[Dict[str, Any]]:
        """
        Return standard OpenAPI/OpenAI function definitions for authorized MCP tools only.
        Adheres to Principle 3: Send ONLY tools authorized for current user/agent.
        """
        tools = await self.list_available_tools()
        definitions = []
        for t in tools:
            if t.get("policy_status") == "ALLOWED":
                definitions.append({
                    "type": "function",
                    "function": {
                        "name": t["name"],
                        "description": t["description"],
                        "parameters": t["input_schema"]
                    }
                })
        return definitions

    async def authorize_and_execute_tool(
        self,
        db: AsyncSession,
        user: User,
        agent: Agent,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate security policy before execution.
        Executes ONLY if authorized.
        Records distinct security events for policy decision and execution outcome.
        """
        # Parse namespacing: e.g. "agentsentry-local:get_system_health" or "get_system_health"
        server_name = self.client.server_name
        bare_tool_name = tool_name
        if ":" in tool_name:
            server_name, bare_tool_name = tool_name.split(":", 1)

        # -------------------------------------------------------------
        # 1. Server Allowlist Check (Default-Deny)
        # -------------------------------------------------------------
        if server_name not in ALLOWED_MCP_SERVERS:
            logger.warning(f"MCP Server '{server_name}' rejected: not in server allowlist.")
            await self._record_policy_denial(
                db=db,
                agent=agent,
                tool_name=tool_name,
                arguments=arguments,
                reason=f"MCP Server '{server_name}' is not in the approved runtime server allowlist.",
                risk_score=90
            )
            return {
                "tool": tool_name,
                "status": "DENIED",
                "reason": f"CRITICAL: MCP Server '{server_name}' is not in approved allowlist (Default-Deny enforced).",
                "mcp_server": server_name
            }

        server_config = ALLOWED_MCP_SERVERS[server_name]
        allowed_tools = server_config["allowed_tools"]

        # -------------------------------------------------------------
        # 2. Tool Allowlist Check (Default-Deny)
        # -------------------------------------------------------------
        if bare_tool_name not in allowed_tools:
            logger.warning(f"MCP Tool '{bare_tool_name}' rejected: not in tool allowlist.")
            await self._record_policy_denial(
                db=db,
                agent=agent,
                tool_name=tool_name,
                arguments=arguments,
                reason=f"Tool '{bare_tool_name}' is not authorized on server '{server_name}'.",
                risk_score=85
            )
            return {
                "tool": tool_name,
                "status": "DENIED",
                "reason": f"Tool '{bare_tool_name}' is not authorized by runtime policy.",
                "mcp_server": server_name
            }

        # -------------------------------------------------------------
        # 3. Argument Safety & Canary Inspection
        # -------------------------------------------------------------
        args_str = str(arguments)
        
        # Check for command injection sequences in arguments
        for bad_pattern in DISALLOWED_ARGUMENT_PATTERNS:
            if bad_pattern in args_str:
                logger.warning(f"Adversarial pattern '{bad_pattern}' detected in MCP tool arguments!")
                await self._record_policy_denial(
                    db=db,
                    agent=agent,
                    tool_name=tool_name,
                    arguments=arguments,
                    reason=f"Potentially adversarial command pattern '{bad_pattern}' in tool arguments.",
                    risk_score=95
                )
                return {
                    "tool": tool_name,
                    "status": "DENIED",
                    "reason": f"CRITICAL: Argument safety check failed: disallowed pattern '{bad_pattern}' detected.",
                    "mcp_server": server_name
                }

        # Check GitHub repository parameter allowlist (least-privilege boundary)
        if bare_tool_name.startswith("github_") and "repository" in arguments:
            from backend.mcp.github_service import validate_repository_allowed, get_allowed_repositories
            target_repo = str(arguments.get("repository", ""))
            if not validate_repository_allowed(target_repo):
                logger.warning(f"GitHub repository '{target_repo}' rejected: not in repository allowlist.")
                await self._record_policy_denial(
                    db=db,
                    agent=agent,
                    tool_name=tool_name,
                    arguments=arguments,
                    reason=f"Repository '{target_repo}' is not in approved repository allowlist: {get_allowed_repositories()}.",
                    risk_score=90
                )
                return {
                    "tool": tool_name,
                    "status": "DENIED",
                    "reason": f"CRITICAL: Repository '{target_repo}' is not in approved repository allowlist (Default-Deny enforced).",
                    "mcp_server": server_name
                }

        # Check for active Canary Token leakage in tool arguments
        canary_tokens = (await db.execute(
            select(HoneyToken).where(HoneyToken.agent_id == agent.id, HoneyToken.status == "active")
        )).scalars().all()
        leaked_canary = any(t.value in args_str for t in canary_tokens if t.value)

        if leaked_canary:
            logger.critical(f"HoneyToken Canary secret detected in MCP tool call arguments for agent {agent.id}!")
            await self._record_policy_denial(
                db=db,
                agent=agent,
                tool_name=tool_name,
                arguments={"sanitized": "[REDACTED_CANARY_SECRET_IN_ARGUMENTS]"},
                reason="Active HoneyToken Canary secret detected in tool arguments (exfiltration attempt).",
                risk_score=100
            )
            return {
                "tool": tool_name,
                "status": "DENIED",
                "reason": "CRITICAL: HoneyToken Tripwire triggered: canary secret passed into tool arguments.",
                "mcp_server": server_name
            }

        # -------------------------------------------------------------
        # 4. Dispatch to MCP Server (Authorized Path)
        # -------------------------------------------------------------
        tool_config = allowed_tools[bare_tool_name]
        timeout = tool_config.get("max_timeout", 5.0)

        try:
            mcp_result = await self.client.call_tool(
                tool_name=bare_tool_name,
                arguments=arguments,
                timeout=timeout
            )
        except MCPSchemaValidationError as sve:
            return {
                "tool": tool_name,
                "status": "VALIDATION_ERROR",
                "reason": f"Schema validation error: {str(sve)}",
                "mcp_server": server_name
            }
        except MCPConnectionError as ce:
            logger.error(f"MCP server connection error: {ce}")
            return {
                "tool": tool_name,
                "status": "UNAVAILABLE",
                "reason": f"MCP server '{server_name}' connection unavailable: {str(ce)[:120]}",
                "mcp_server": server_name
            }
        except Exception as e:
            logger.error(f"MCP execution exception: {e}")
            return {
                "tool": tool_name,
                "status": "EXECUTION_ERROR",
                "reason": f"Tool execution failed: {str(e)[:120]}",
                "mcp_server": server_name
            }

        # -------------------------------------------------------------
        # 5. Output Inspection & Post-Execution Audit
        # -------------------------------------------------------------
        raw_output_text = "\n".join([c.text for c in mcp_result.content])

        # Check output for canary secret leakage
        output_leaked = any(t.value in raw_output_text for t in canary_tokens if t.value)
        if output_leaked:
            logger.critical(f"Canary secret detected in MCP tool output!")
            for t in canary_tokens:
                if t.value:
                    raw_output_text = raw_output_text.replace(t.value, "[REDACTED_CANARY_TOKEN]")

        # Persist audit record for tool execution
        exec_event = SecurityEvent(
            agent_id=agent.id,
            event_type="mcp_tool_execution",
            severity="LOW" if not mcp_result.isError else "MEDIUM",
            source="mcp_gateway",
            risk_score=10 if not mcp_result.isError else 40,
            evidence={
                "tool": bare_tool_name,
                "server": server_name,
                "arguments": arguments,
                "is_error": mcp_result.isError,
                "output_preview": raw_output_text[:200]
            },
            action="EXECUTED"
        )
        db.add(exec_event)
        await db.commit()

        # Parse output as JSON if applicable for clean API presentation
        formatted_output: Any = raw_output_text
        try:
            formatted_output = json.loads(raw_output_text)
        except Exception:
            pass

        return {
            "tool": bare_tool_name,
            "status": "AUTHORIZED",
            "mcp_server": server_name,
            "is_error": mcp_result.isError,
            "output": formatted_output,
            "audit_event_id": str(exec_event.id)
        }

    async def _record_policy_denial(
        self,
        db: AsyncSession,
        agent: Agent,
        tool_name: str,
        arguments: Dict[str, Any],
        reason: str,
        risk_score: int
    ):
        """Record a policy denial security event and alert in PostgreSQL."""
        event = SecurityEvent(
            agent_id=agent.id,
            event_type="unauthorized_mcp_tool_attempt",
            severity="HIGH" if risk_score >= 80 else "MEDIUM",
            source="mcp_gateway",
            risk_score=risk_score,
            evidence={
                "tool": tool_name,
                "arguments": arguments,
                "reason": reason
            },
            action="DENIED"
        )
        db.add(event)
        await db.flush()
        await AlertService.generate_alert_from_event(db, event)
        await db.commit()

# Global gateway singleton
_gateway_instance: Optional[MCPSecurityGateway] = None

def get_mcp_gateway() -> MCPSecurityGateway:
    global _gateway_instance
    if _gateway_instance is None:
        _gateway_instance = MCPSecurityGateway()
    return _gateway_instance
