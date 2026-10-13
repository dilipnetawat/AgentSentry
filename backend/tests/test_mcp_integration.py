"""
AgentSentry — Automated MCP Integration & Security Gateway Test Suite
Validates real MCP JSON-RPC 2.0 stdio server, tool discovery, schema validation,
policy gateway authorization, audit persistence, and truthful provider errors.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.mcp.client import AgentSentryMCPClient, MCPSchemaValidationError, MCPClientError
from backend.mcp.security_gateway import MCPSecurityGateway
from backend.models.agent import Agent
from backend.models.user import User
from backend.models.security_event import SecurityEvent
from backend.models.honeytoken import HoneyToken
from backend.models.alert import Alert

@pytest_asyncio.fixture
async def mcp_client():
    """Fixture providing a connected AgentSentryMCPClient."""
    client = AgentSentryMCPClient(server_name="agentsentry-local")
    await client.connect()
    yield client
    await client.close()

@pytest.mark.asyncio
async def test_mcp_server_protocol_handshake(mcp_client: AgentSentryMCPClient):
    """Test 1: Verify MCP server connects and performs protocol handshake."""
    assert mcp_client.is_connected
    assert mcp_client._initialized
    assert mcp_client.server_name == "agentsentry-local"

@pytest.mark.asyncio
async def test_mcp_tool_discovery(mcp_client: AgentSentryMCPClient):
    """Test 2: Verify real tool discovery using MCP protocol tools/list."""
    tools = await mcp_client.list_tools()
    assert len(tools) >= 3
    tool_names = [t.name for t in tools]
    assert "get_system_health" in tool_names
    assert "get_recent_security_events" in tool_names
    assert "inspect_agent_posture" in tool_names

    # Check schemas
    health_tool = next(t for t in tools if t.name == "get_system_health")
    assert health_tool.inputSchema.type == "object"
    assert "include_metrics" in health_tool.inputSchema.properties

@pytest.mark.asyncio
async def test_mcp_tool_execution_valid_args(mcp_client: AgentSentryMCPClient):
    """Test 3: Execute a valid MCP tool call over stdio and parse result."""
    result = await mcp_client.call_tool("get_system_health", {"include_metrics": True})
    assert not result.isError
    assert len(result.content) == 1
    text = result.content[0].text
    assert "operational" in text or "subsystems" in text
    assert "PostgreSQL" in text

@pytest.mark.asyncio
async def test_mcp_tool_execution_schema_validation(mcp_client: AgentSentryMCPClient):
    """Test 4: Verify client enforces argument schema validation before sending."""
    # include_metrics must be boolean, not string
    with pytest.raises(MCPSchemaValidationError):
        await mcp_client.call_tool("get_system_health", {"include_metrics": "true_string"})

@pytest.mark.asyncio
async def test_mcp_security_gateway_authorized_tool(
    mcp_client: AgentSentryMCPClient,
    db_session: AsyncSession
):
    """Test 5: Verify MCPSecurityGateway approves authorized tool and persists audit event."""
    gateway = MCPSecurityGateway(client=mcp_client)
    
    # Create test agent
    agent = Agent(name="MCP-Test-Agent", status="active")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    user = User(email="analyst@agentsentry.local", password_hash="pw", role="analyst")

    result = await gateway.authorize_and_execute_tool(
        db=db_session,
        user=user,
        agent=agent,
        tool_name="get_system_health",
        arguments={"include_metrics": False}
    )

    assert result["status"] == "AUTHORIZED"
    assert not result["is_error"]
    assert "audit_event_id" in result

    # Verify audit event in DB
    import uuid
    event_uuid = uuid.UUID(str(result["audit_event_id"]))
    event_stmt = select(SecurityEvent).where(SecurityEvent.id == event_uuid)
    event = (await db_session.execute(event_stmt)).scalar_one_or_none()
    assert event is not None
    assert event.event_type == "mcp_tool_execution"
    assert event.action == "EXECUTED"

@pytest.mark.asyncio
async def test_mcp_security_gateway_denies_unauthorized_tool(
    mcp_client: AgentSentryMCPClient,
    db_session: AsyncSession
):
    """Test 6: Verify default-deny rejects unauthorized tool without calling server."""
    gateway = MCPSecurityGateway(client=mcp_client)
    
    agent = Agent(name="MCP-Attacker-Agent", status="active")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    user = User(email="operator@agentsentry.local", password_hash="pw", role="analyst")

    # Attempt unauthorized tool
    result = await gateway.authorize_and_execute_tool(
        db=db_session,
        user=user,
        agent=agent,
        tool_name="execute_host_shell",
        arguments={"command": "cat /etc/shadow"}
    )

    assert result["status"] == "DENIED"
    assert "runtime policy" in result["reason"]

    # Verify denial event and alert were persisted
    event_stmt = select(SecurityEvent).where(
        SecurityEvent.agent_id == agent.id,
        SecurityEvent.action == "DENIED"
    )
    event = (await db_session.execute(event_stmt)).scalar_one_or_none()
    assert event is not None
    assert event.event_type == "unauthorized_mcp_tool_attempt"
    assert event.risk_score >= 80

@pytest.mark.asyncio
async def test_mcp_security_gateway_intercepts_canary_leak(
    mcp_client: AgentSentryMCPClient,
    db_session: AsyncSession
):
    """Test 7: Verify gateway halts tool execution if an active HoneyToken canary is passed in arguments."""
    gateway = MCPSecurityGateway(client=mcp_client)
    
    agent = Agent(name="MCP-Canary-Agent", status="active")
    db_session.add(agent)
    await db_session.flush()

    canary = HoneyToken(
        agent_id=agent.id,
        scope="api_gateway",
        token_type="api_key",
        value="tok_CANARY_TEST_MCP_TRIPWIRE_SECRET",
        status="active"
    )
    db_session.add(canary)
    await db_session.commit()

    user = User(email="operator@agentsentry.local", password_hash="pw", role="analyst")

    # Pass the canary token into arguments
    result = await gateway.authorize_and_execute_tool(
        db=db_session,
        user=user,
        agent=agent,
        tool_name="get_system_health",
        arguments={"include_metrics": False, "exfil": "tok_CANARY_TEST_MCP_TRIPWIRE_SECRET"}
    )

    assert result["status"] == "DENIED"
    assert "HoneyToken Tripwire" in result["reason"]

@pytest.mark.asyncio
async def test_playground_api_mcp_tools_and_execution(admin_client: AsyncClient):
    """Test 8: Test API endpoints GET /playground/mcp/tools and POST /playground/execute with MCP tool."""
    # 1. Discover MCP tools via REST endpoint
    tools_res = await admin_client.get("/api/v1/playground/mcp/tools")
    assert tools_res.status_code == 200
    tools = tools_res.json()
    assert len(tools) >= 3
    tool_names = [t["name"] for t in tools]
    assert "get_system_health" in tool_names

    # 2. Execute MCP tool via playground
    exec_payload = {
        "prompt": "Inspect the health of our security deployment.",
        "provider": "local",
        "requested_tool": {
            "name": "get_system_health",
            "arguments": {"include_metrics": True}
        }
    }
    exec_res = await admin_client.post("/api/v1/playground/execute", json=exec_payload)
    assert exec_res.status_code == 200
    data = exec_res.json()
    assert data["decision"] == "ALLOW"
    assert data["tool_execution"] is not None
    assert data["tool_execution"]["status"] == "AUTHORIZED"
    output_val = data["tool_execution"]["output"]
    if isinstance(output_val, str):
        import json
        output_val = json.loads(output_val)
    assert output_val["status"] in ["operational", "degraded"]
    assert "subsystems" in output_val

@pytest.mark.asyncio
async def test_unconfigured_external_provider_honest_reporting(admin_client: AsyncClient):
    """Test 9: Verify unconfigured external provider reports honest error rather than fake inference."""
    payload = {
        "prompt": "Explain defense in depth.",
        "provider": "openai"
    }
    res = await admin_client.post("/api/v1/playground/execute", json=payload)
    assert res.status_code == 200
    data = res.json()
    # Pipeline shouldn't crash, but ai_response should honestly report provider error / not configured
    assert "[Provider Error]" in data["ai_response"] or "NOT CONFIGURED" in data["ai_response"]
