from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from backend.models.user import User
from backend.api.deps import get_current_user
from backend.services.firewall.rules import build_rule_registry
from backend.mcp.security_gateway import ALLOWED_MCP_SERVERS, DISALLOWED_ARGUMENT_PATTERNS

router = APIRouter(prefix="/api/v1/policies", tags=["Security Policies"])

@router.get("")
async def get_security_policies(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns verified, authentic security policies, deterministic rule registry,
    decision thresholds, and tool authorization fences enforced by AgentSentry.
    """
    rules = build_rule_registry()
    rules_data = []
    for r in rules:
        rules_data.append({
            "rule_id": r.rule_id,
            "category": r.category,
            "name": r.name,
            "description": r.description,
            "severity": r.severity,
            "base_score": r.base_score,
            "mitigation": r.mitigation,
            "version": r.version,
            "pattern_count": len(r.patterns),
            "negative_context_count": len(r.negative_contexts),
            "status": "active",
            "enforcement": "BLOCK" if r.base_score >= 70 else ("QUARANTINE" if r.base_score >= 30 else "ALLOW")
        })

    # Allowed tools extracted from security gateway
    allowed_tools = []
    for server_id, server_conf in ALLOWED_MCP_SERVERS.items():
        for tool_name, tool_meta in server_conf.get("allowed_tools", {}).items():
            allowed_tools.append({
                "server": server_id,
                "tool_name": tool_name,
                "capability": tool_meta.get("capability", "read_only"),
                "read_only": tool_meta.get("read_only", True),
                "max_timeout_sec": tool_meta.get("max_timeout", 5.0),
                "status": "AUTHORIZED"
            })

    return {
        "framework": "AgentSentry Security Runtime v1.2",
        "thresholds": {
            "block_threshold": 70,
            "quarantine_threshold": 30,
            "allow_threshold": 0,
            "description": "Risk score >= 70 triggers immediate BLOCK; 30–69 triggers QUARANTINE; < 30 allows execution."
        },
        "engine_mode": "Deterministic Heuristics + ONNX FastEmbed (bge-small-en-v1.5)",
        "rules_count": len(rules_data),
        "rules": rules_data,
        "tool_authorization": {
            "default_action": "DENY",
            "enforcement_mode": "Strict Allowlist",
            "disallowed_argument_patterns": DISALLOWED_ARGUMENT_PATTERNS,
            "authorized_tools": allowed_tools
        },
        "canary_mesh_policy": {
            "strategy": "Dual-token injection (system prompt & tool memory)",
            "leak_action": "IMMEDIATE_FLEET_ISOLATION",
            "token_types": ["api_key", "db_uri", "jwt_bearer"],
            "rotation_interval_days": 14
        }
    }
