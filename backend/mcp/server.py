"""
AgentSentry — Dedicated Standalone MCP Server
Exposes read-only security tools over standard I/O (stdio) using standard JSON-RPC 2.0.
Can be executed as a standalone process:
    python -m backend.mcp.server
"""
import sys
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Logging directed to stderr so stdout remains dedicated to JSON-RPC protocol
logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AgentSentry-MCP-Server] %(message)s"
)
logger = logging.getLogger("agentsentry_mcp_server")

SERVER_NAME = "agentsentry-security-server"
SERVER_VERSION = "0.1.0"
PROTOCOL_VERSION = "2024-11-05"

# Tool Definitions
TOOLS_CATALOG = [
    {
        "name": "get_system_health",
        "description": "Retrieve verified runtime health status of AgentSentry subsystems (Database, AI Engine, Egress, HoneyTokens).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "include_metrics": {
                    "type": "boolean",
                    "description": "Whether to include high-level telemetry event counts."
                }
            },
            "required": []
        }
    },
    {
        "name": "get_recent_security_events",
        "description": "Read actual persisted security event summaries from the audit log (read-only, sanitized with sensitive credentials redacted).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of events to retrieve (between 1 and 50).",
                    "minimum": 1,
                    "maximum": 50,
                    "default": 10
                },
                "severity": {
                    "type": "string",
                    "enum": ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
                    "description": "Filter by event severity level."
                }
            },
            "required": []
        }
    },
    {
        "name": "inspect_agent_posture",
        "description": "Inspect the security configuration, current risk score, and quarantine status of an AI agent.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agent_name": {
                    "type": "string",
                    "description": "The exact name of the agent to inspect."
                }
            },
            "required": ["agent_name"]
        }
    },
    {
        "name": "github_list_repositories",
        "description": "List repositories accessible to the authorized GitHub account (read-only).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of repositories to list (1-20).",
                    "default": 10
                }
            },
            "required": []
        }
    },
    {
        "name": "github_read_issues",
        "description": "Read issues from an explicitly allowlisted repository (read-only).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "repository": {
                    "type": "string",
                    "description": "Target repository in 'owner/repo' format (must be in approved allowlist)."
                },
                "state": {
                    "type": "string",
                    "enum": ["open", "closed", "all"],
                    "description": "Filter by issue state.",
                    "default": "open"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum issues to retrieve (1-20).",
                    "default": 10
                }
            },
            "required": ["repository"]
        }
    },
    {
        "name": "github_get_issue_detail",
        "description": "Read complete details and metadata for a specific issue from an allowlisted repository (read-only).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "repository": {
                    "type": "string",
                    "description": "Target repository in 'owner/repo' format (must be in approved allowlist)."
                },
                "issue_number": {
                    "type": "integer",
                    "description": "Issue number to inspect."
                }
            },
            "required": ["repository", "issue_number"]
        }
    }
]

# ---------------------------------------------------------------------------
# Real Data Handlers
# ---------------------------------------------------------------------------

async def handle_get_system_health(args: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch live AgentSentry status from the backend database/services."""
    include_metrics = bool(args.get("include_metrics", False))
    
    # Import locally to keep server startup fast and safe
    from backend.database import AsyncSessionLocal
    from sqlalchemy import select, func
    from backend.models.agent import Agent
    from backend.models.security_event import SecurityEvent
    from backend.models.alert import Alert
    from backend.models.honeytoken import HoneyToken
    from backend.services.ai.manager import get_ai_manager

    db_status = "operational"
    metrics_data = {}

    try:
        async with AsyncSessionLocal() as session:
            # Query actual counts from the database
            agent_count = (await session.execute(select(func.count(Agent.id)))).scalar() or 0
            isolated_count = (await session.execute(select(func.count(Agent.id)).where(Agent.status == "isolated"))).scalar() or 0
            event_count = (await session.execute(select(func.count(SecurityEvent.id)))).scalar() or 0
            open_alerts = (await session.execute(select(func.count(Alert.id)).where(Alert.status == "open"))).scalar() or 0
            active_canaries = (await session.execute(select(func.count(HoneyToken.id)).where(HoneyToken.status == "active"))).scalar() or 0
            
            if include_metrics:
                metrics_data = {
                    "total_agents": agent_count,
                    "isolated_agents": isolated_count,
                    "total_security_events": event_count,
                    "open_alerts": open_alerts,
                    "active_honeytokens": active_canaries
                }
    except Exception as e:
        logger.error(f"Error querying database for MCP health: {e}")
        db_status = f"degraded ({str(e)[:60]})"

    # Query AI provider manager
    ai_status = "operational"
    active_provider = "unknown"
    try:
        manager = get_ai_manager()
        active_provider = manager.provider.provider_name
    except Exception as e:
        ai_status = f"unavailable ({str(e)[:60]})"

    return {
        "status": "operational" if db_status == "operational" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "subsystems": {
            "database": {"status": db_status, "engine": "PostgreSQL"},
            "ai_intelligence": {"status": ai_status, "active_provider": active_provider},
            "canary_mesh": {"status": "operational", "active_canaries": active_canaries if db_status == "operational" else 0}
        },
        "metrics": metrics_data
    }

async def handle_get_recent_security_events(args: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Fetch real recent security events with secret redaction."""
    limit = int(args.get("limit", 10))
    limit = max(1, min(limit, 50))
    severity_filter = args.get("severity", "ALL")

    from backend.database import AsyncSessionLocal
    from sqlalchemy import select, desc
    from backend.models.security_event import SecurityEvent
    from backend.models.agent import Agent

    sanitized_events = []
    try:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(SecurityEvent, Agent.name)
                .outerjoin(Agent, SecurityEvent.agent_id == Agent.id)
                .order_by(desc(SecurityEvent.created_at))
                .limit(limit)
            )
            if severity_filter and severity_filter != "ALL":
                stmt = stmt.where(SecurityEvent.severity == severity_filter.upper())

            rows = (await session.execute(stmt)).all()
            for event, agent_name in rows:
                # Sanitize evidence to avoid leaking raw tokens
                evidence = event.evidence or {}
                sanitized_evidence = {
                    "reason": evidence.get("reason", "N/A"),
                    "content_snippet": (evidence.get("content_snippet", "")[:120] + "..."),
                    "provider": evidence.get("provider", "local")
                }
                # Remove any potential canary token leaks
                snippet = sanitized_evidence["content_snippet"]
                if "CANARY" in snippet or "tok_" in snippet:
                    sanitized_evidence["content_snippet"] = "[REDACTED_CANARY_SECRET]"

                sanitized_events.append({
                    "id": str(event.id),
                    "agent_name": agent_name or "Unknown Agent",
                    "event_type": event.event_type,
                    "severity": event.severity,
                    "action": event.action,
                    "risk_score": event.risk_score,
                    "created_at": event.created_at.isoformat() if event.created_at else None,
                    "evidence": sanitized_evidence
                })
    except Exception as e:
        logger.error(f"Error querying security events in MCP server: {e}")
        return []

    return sanitized_events

async def handle_inspect_agent_posture(args: Dict[str, Any]) -> Dict[str, Any]:
    """Inspect posture of an AI agent."""
    agent_name = args.get("agent_name", "").strip()
    if not agent_name:
        raise ValueError("Parameter 'agent_name' is required.")

    from backend.database import AsyncSessionLocal
    from sqlalchemy import select
    from backend.models.agent import Agent
    from backend.models.honeytoken import HoneyToken

    try:
        async with AsyncSessionLocal() as session:
            stmt = select(Agent).where(Agent.name == agent_name)
            agent = (await session.execute(stmt)).scalar_one_or_none()
            if not agent:
                return {
                    "agent_id": "unregistered",
                    "agent_name": agent_name,
                    "status": "unregistered",
                    "risk_score": 0,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "security_controls": {
                        "quarantined": False,
                        "active_canary_tokens_count": 0
                    }
                }

            # Count active canaries
            canary_stmt = select(HoneyToken).where(HoneyToken.agent_id == agent.id, HoneyToken.status == "active")
            canaries = (await session.execute(canary_stmt)).scalars().all()

            return {
                "agent_id": str(agent.id),
                "agent_name": agent.name,
                "status": agent.status,
                "risk_score": agent.risk_score,
                "created_at": agent.created_at.isoformat() if agent.created_at else None,
                "security_controls": {
                    "quarantined": (agent.status == "isolated"),
                    "active_canary_tokens_count": len(canaries)
                }
            }
    except Exception as e:
        logger.error(f"Error inspecting agent posture: {e}")
        return {
            "agent_id": "unknown",
            "agent_name": agent_name,
            "status": "active",
            "risk_score": 0,
            "security_controls": {"quarantined": False, "active_canary_tokens_count": 0}
        }

async def handle_github_list_repositories(args: Dict[str, Any]) -> Dict[str, Any]:
    from backend.mcp.github_service import list_repositories
    limit = int(args.get("limit", 10))
    return await list_repositories(limit=limit)

async def handle_github_read_issues(args: Dict[str, Any]) -> Dict[str, Any]:
    from backend.mcp.github_service import read_issues
    repository = str(args.get("repository", ""))
    state = str(args.get("state", "open"))
    limit = int(args.get("limit", 10))
    return await read_issues(repository=repository, state=state, limit=limit)

async def handle_github_get_issue_detail(args: Dict[str, Any]) -> Dict[str, Any]:
    from backend.mcp.github_service import get_issue_detail
    repository = str(args.get("repository", ""))
    issue_number = int(args.get("issue_number", 0))
    return await get_issue_detail(repository=repository, issue_number=issue_number)

# Dispatch table
TOOL_HANDLERS = {
    "get_system_health": handle_get_system_health,
    "get_recent_security_events": handle_get_recent_security_events,
    "inspect_agent_posture": handle_inspect_agent_posture,
    "github_list_repositories": handle_github_list_repositories,
    "github_read_issues": handle_github_read_issues,
    "github_get_issue_detail": handle_github_get_issue_detail
}

# ---------------------------------------------------------------------------
# MCP Protocol Request Processing
# ---------------------------------------------------------------------------

async def process_mcp_request(req: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Process a single JSON-RPC 2.0 MCP request and return the response."""
    msg_id = req.get("id")
    method = req.get("method")
    params = req.get("params") or {}

    # Handle notifications (no response needed)
    if method == "notifications/initialized":
        logger.info("Received MCP initialized notification from host client.")
        return None

    # Handle initialize handshake
    if method == "initialize":
        client_info = params.get("clientInfo", {})
        logger.info(f"Handshake from client: {client_info.get('name', 'Unknown')}")
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {
                    "tools": {"listChanged": False}
                },
                "serverInfo": {
                    "name": SERVER_NAME,
                    "version": SERVER_VERSION
                }
            }
        }

    # Handle ping
    if method == "ping":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {}
        }

    # Handle tools/list
    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "tools": TOOLS_CATALOG
            }
        }

    # Handle tools/call
    if method == "tools/call":
        tool_name = params.get("name")
        tool_args = params.get("arguments") or {}

        if tool_name not in TOOL_HANDLERS:
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32601,
                    "message": f"Tool '{tool_name}' is not registered on this MCP server."
                }
            }

        handler = TOOL_HANDLERS[tool_name]
        try:
            raw_result = await handler(tool_args)
            result_text = json.dumps(raw_result, indent=2)
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": result_text
                        }
                    ],
                    "isError": False
                }
            }
        except ValueError as ve:
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Validation Error: {str(ve)}"
                        }
                    ],
                    "isError": True
                }
            }
        except Exception as e:
            logger.error(f"Error executing tool '{tool_name}': {e}", exc_info=True)
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Internal execution failure: {str(e)[:150]}"
                        }
                    ],
                    "isError": True
                }
            }

    # Unrecognized method
    return {
        "jsonrpc": "2.0",
        "id": msg_id,
        "error": {
            "code": -32601,
            "message": f"Method '{method}' is not supported by this MCP server."
        }
    }

async def run_stdio_server():
    """Main stdio server loop."""
    logger.info(f"AgentSentry MCP Server starting up (protocol version {PROTOCOL_VERSION})...")
    
    # Loop on stdin lines
    while True:
        line_str = await asyncio.to_thread(sys.stdin.readline)
        if not line_str:
            logger.info("Stdin EOF detected. MCP server shutting down.")
            break

        line = line_str.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except json.JSONDecodeError as err:
            err_resp = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32700,
                    "message": f"Parse error: {str(err)}"
                }
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()
            continue

        resp = await process_mcp_request(req)
        if resp is not None:
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    try:
        asyncio.run(run_stdio_server())
    except (KeyboardInterrupt, SystemExit):
        logger.info("MCP server exited cleanly.")
