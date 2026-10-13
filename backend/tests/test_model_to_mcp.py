"""
AgentSentry — Model-to-MCP Autonomous Tool Calling Test Suite
Tests Phase 2 functionality:
- Generative AI provider function calling interface (OpenAI, Gemini, Grok, Local)
- Intent detection and autonomous tool calling
- Multi-turn grounded synthesis from real MCP tool outputs
- Model tool definition formatting adhering to default-deny policy
- Iteration bound enforcement (prevent infinite loops) and total timeout enforcement
- Security gateway validation and PostgreSQL audit logging
"""
import pytest
import pytest_asyncio
import uuid
import json
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.mcp.client import AgentSentryMCPClient
from backend.mcp.security_gateway import MCPSecurityGateway, get_mcp_gateway
from backend.services.ai.local_provider import LocalAIProvider
from backend.services.playground_service import PlaygroundService
from backend.models.agent import Agent
from backend.models.user import User
from backend.models.security_event import SecurityEvent
from backend.models.honeytoken import HoneyToken

@pytest_asyncio.fixture
async def mcp_client():
    client = AgentSentryMCPClient(server_name="agentsentry-local")
    await client.connect()
    yield client
    await client.close()

@pytest.mark.asyncio
async def test_local_provider_intent_detection():
    """Verify LocalAIProvider detects diagnostic tool intent and emits structured tool_calls."""
    provider = LocalAIProvider()
    tools = [
        {"type": "function", "function": {"name": "get_system_health", "description": "System health", "parameters": {}}},
        {"type": "function", "function": {"name": "get_recent_security_events", "description": "Security events", "parameters": {}}},
        {"type": "function", "function": {"name": "inspect_agent_posture", "description": "Agent posture", "parameters": {}}}
    ]

    # 1. Health Intent
    res1 = await provider.generate_response(
        prompt="Please check system health and database diagnostics.",
        tools=tools
    )
    assert res1["tool_calls"] is not None
    assert len(res1["tool_calls"]) == 1
    assert res1["tool_calls"][0]["function"]["name"] == "get_system_health"
    assert res1["finish_reason"] == "tool_calls"

    # 2. Events Intent
    res2 = await provider.generate_response(
        prompt="Show me recent security events from the firewall log.",
        tools=tools
    )
    assert res2["tool_calls"] is not None
    assert len(res2["tool_calls"]) == 1
    assert res2["tool_calls"][0]["function"]["name"] == "get_recent_security_events"

    # 3. Posture Intent
    res3 = await provider.generate_response(
        prompt="Inspect security posture and active honeytokens for the agent.",
        tools=tools
    )
    assert res3["tool_calls"] is not None
    assert len(res3["tool_calls"]) == 1
    assert res3["tool_calls"][0]["function"]["name"] == "inspect_agent_posture"

    # 4. Non-tool Conversational Intent
    res4 = await provider.generate_response(
        prompt="Explain what a cryptographic hash function is.",
        tools=tools
    )
    assert res4["tool_calls"] is None
    assert res4["finish_reason"] == "stop"
    assert "clearance: allow" in res4["content"].lower()

@pytest.mark.asyncio
async def test_local_provider_multi_turn_grounded_synthesis():
    """Verify LocalAIProvider grounds final synthesis on actual MCP tool output."""
    provider = LocalAIProvider()
    
    mock_health_data = {
        "status": "operational",
        "subsystems": {
            "database": {"status": "connected", "engine": "PostgreSQL"},
            "ai_intelligence": {"status": "operational", "active_provider": "local"},
            "canary_mesh": {"status": "operational", "active_canaries": 3}
        },
        "metrics": {
            "total_agents": 4,
            "total_security_events": 12,
            "open_alerts": 1
        }
    }

    messages = [
        {"role": "user", "content": "Check system health."},
        {"role": "assistant", "content": "", "tool_calls": [{"id": "c1", "type": "function", "function": {"name": "get_system_health"}}]},
        {"role": "tool", "tool_call_id": "c1", "name": "get_system_health", "content": json.dumps(mock_health_data)}
    ]

    res = await provider.generate_response(
        prompt="Check system health.",
        messages=messages
    )

    assert res["tool_calls"] is None
    assert res["finish_reason"] == "stop"
    content = res["content"]
    assert "OPERATIONAL" in content
    assert "PostgreSQL" in content
    assert "3 active canary traps" in content
    assert "12 logged security events" in content

@pytest.mark.asyncio
async def test_gateway_model_tool_definitions(mcp_client: AgentSentryMCPClient):
    """Verify MCPSecurityGateway returns OpenAI-compatible schemas for authorized tools only."""
    gateway = MCPSecurityGateway(client=mcp_client)
    defs = await gateway.get_model_tool_definitions()
    
    assert len(defs) >= 3
    tool_names = [d["function"]["name"] for d in defs]
    assert "get_system_health" in tool_names
    assert "get_recent_security_events" in tool_names
    assert "inspect_agent_posture" in tool_names
    # Restricted / disallowed tools must NOT be exposed
    assert "execute_shell" not in tool_names
    assert "execute_arbitrary_script" not in tool_names

    for d in defs:
        assert d["type"] == "function"
        assert "name" in d["function"]
        assert "description" in d["function"]
        assert "parameters" in d["function"]

@pytest.mark.asyncio
async def test_autonomous_model_to_mcp_health_execution(
    mcp_client: AgentSentryMCPClient,
    db_session: AsyncSession
):
    """Verify autonomous model-to-MCP loop: user prompt -> model requests tool -> gateway executes -> synthesis."""
    user = User(email=f"tester_{uuid.uuid4().hex[:6]}@agentsentry.local", password_hash="pw", role="analyst")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    result = await PlaygroundService.execute_request(
        db=db_session,
        user=user,
        prompt="Check current system health and subsystem status.",
        provider_name="local",
        enable_mcp_tools=True
    )

    assert result["decision"] == "ALLOW"
    assert result["tool_execution"] is not None
    assert result["tool_execution"]["status"] == "AUTHORIZED"
    assert result["tool_execution"]["tool"] == "get_system_health"
    assert result["model_tool_calls"] is not None
    assert len(result["model_tool_calls"]) >= 1

    # Final response must be grounded in real telemetry
    assert "Diagnostic Synthesis" in result["ai_response"]
    assert "PostgreSQL" in result["ai_response"]

    # Verify audit event in DB
    event_stmt = select(SecurityEvent).where(
        SecurityEvent.event_type == "mcp_tool_execution",
        SecurityEvent.action == "EXECUTED"
    )
    events = (await db_session.execute(event_stmt)).scalars().all()
    assert len(events) >= 1

@pytest.mark.asyncio
async def test_autonomous_model_to_mcp_events_execution(
    mcp_client: AgentSentryMCPClient,
    db_session: AsyncSession
):
    """Verify autonomous execution for recent security events query."""
    user = User(email=f"tester_{uuid.uuid4().hex[:6]}@agentsentry.local", password_hash="pw", role="analyst")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    result = await PlaygroundService.execute_request(
        db=db_session,
        user=user,
        prompt="Show me recent security events logged by the firewall.",
        provider_name="local",
        enable_mcp_tools=True
    )

    assert result["decision"] == "ALLOW"
    assert result["tool_execution"] is not None
    assert result["tool_execution"]["status"] == "AUTHORIZED"
    assert result["tool_execution"]["tool"] == "get_recent_security_events"
    assert "Security Audit" in result["ai_response"]

@pytest.mark.asyncio
async def test_autonomous_loop_iteration_bounds(
    mcp_client: AgentSentryMCPClient,
    db_session: AsyncSession
):
    """Verify execution halts and respects max_iterations to prevent infinite loops."""
    user = User(email=f"tester_{uuid.uuid4().hex[:6]}@agentsentry.local", password_hash="pw", role="analyst")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    result = await PlaygroundService.execute_request(
        db=db_session,
        user=user,
        prompt="Check system health.",
        provider_name="local",
        enable_mcp_tools=True,
        max_iterations=1
    )

    assert result["decision"] == "ALLOW"
    # Max iterations of 1 allows single turn without hanging
    stages = [t["stage"] for t in result["pipeline_trace"]]
    assert "mcp_tool_execution" in stages or "model_tool_request" in stages

@pytest.mark.asyncio
async def test_api_playground_autonomous_scenario(admin_client: AsyncClient):
    """Verify scenario endpoint includes autonomous presets and execute endpoint handles autonomous MCP request."""
    # 1. Check scenario list
    scenarios_res = await admin_client.get("/api/v1/playground/scenarios")
    assert scenarios_res.status_code == 200
    scenarios = scenarios_res.json()
    scenario_ids = [s["id"] for s in scenarios]
    assert "autonomous_mcp_health" in scenario_ids
    assert "autonomous_mcp_events" in scenario_ids
    assert "autonomous_mcp_posture" in scenario_ids

    # 2. Execute autonomous request via REST API
    req_payload = {
        "prompt": "Check the runtime system health status and tell me if the database and subsystems are operational.",
        "provider": "local",
        "enable_mcp_tools": True
    }
    exec_res = await admin_client.post("/api/v1/playground/execute", json=req_payload)
    assert exec_res.status_code == 200
    data = exec_res.json()
    assert data["decision"] == "ALLOW"
    assert data["tool_execution"] is not None
    assert data["tool_execution"]["status"] == "AUTHORIZED"
    assert "get_system_health" in data["tool_execution"]["tool"]
    assert "PostgreSQL" in data["ai_response"]
