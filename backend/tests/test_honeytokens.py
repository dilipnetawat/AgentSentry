import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_create_honeytoken_success(admin_client: AsyncClient):
    # 1. Create an Agent
    agent_resp = await admin_client.post("/api/v1/agents", json={"name": "HoneyToken Agent Test"})
    assert agent_resp.status_code == 201
    agent_id = agent_resp.json()["id"]

    # 2. Generate a HoneyToken for the Agent
    token_resp = await admin_client.post("/api/v1/honeytokens", json={
        "agent_id": agent_id,
        "scope": "system_prompt"
    })
    
    assert token_resp.status_code == 201
    token_data = token_resp.json()
    assert token_data["agent_id"] == agent_id
    assert token_data["scope"] == "system_prompt"
    assert token_data["is_triggered"] is False
    assert "id" in token_data
    
    # 3. Check entropy and format
    value = token_data["value"]
    assert value.startswith("tok_")
    assert len(value) > 40  # 32 bytes URL-safe base64 is ~43 chars + 4 for "tok_" = 47

@pytest.mark.asyncio
async def test_honeytoken_uniqueness(admin_client: AsyncClient):
    agent_resp = await admin_client.post("/api/v1/agents", json={"name": "Unique Test"})
    agent_id = agent_resp.json()["id"]

    resp1 = await admin_client.post("/api/v1/honeytokens", json={"agent_id": agent_id, "scope": "scope1"})
    resp2 = await admin_client.post("/api/v1/honeytokens", json={"agent_id": agent_id, "scope": "scope2"})
    
    val1 = resp1.json()["value"]
    val2 = resp2.json()["value"]
    
    assert val1 != val2

@pytest.mark.asyncio
async def test_create_honeytoken_invalid_agent(admin_client: AsyncClient):
    fake_uuid = str(uuid.uuid4())
    token_resp = await admin_client.post("/api/v1/honeytokens", json={
        "agent_id": fake_uuid,
        "scope": "system_prompt"
    })
    
    assert token_resp.status_code == 404
    assert "Agent not found" in token_resp.json()["detail"]

from backend.services.honeytoken_service import HoneyTokenService
from backend.models.security_event import SecurityEvent
from backend.models.honeytoken import HoneyToken
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_detect_honeytoken_trigger(admin_client: AsyncClient, db_session):
    agent_resp = await admin_client.post("/api/v1/agents", json={"name": "Trigger Test Agent"})
    agent_id = agent_resp.json()["id"]

    token_resp = await admin_client.post("/api/v1/honeytokens", json={"agent_id": agent_id, "scope": "db_record"})
    token_val = token_resp.json()["value"]
    token_id = token_resp.json()["id"]

    db = db_session
    # Test 1: Valid HoneyToken triggers successfully
    content_with_token = f"Here is the secret: {token_val}"
    events = await HoneyTokenService.detect_triggers(db, uuid.UUID(agent_id), content_with_token)
    
    assert len(events) == 1
    event = events[0]
    
    # Test 4: SecurityEvent is created
    assert event.event_type == "honeytoken_trigger"
    # Test 3: Correct Agent is associated
    assert str(event.agent_id) == agent_id
    
    # Test 2: is_triggered changes from false -> true
    stmt = select(HoneyToken).where(HoneyToken.id == uuid.UUID(token_id))
    token_db = (await db.execute(stmt)).scalar_one()
    assert token_db.is_triggered is True
    
    # Test 10: Raw token does not appear in SecurityEvent evidence
    assert token_val not in str(event.evidence)
    assert event.evidence["matched_indicator"] == "REDACTED_TOKEN_VALUE"
    
    # Test 8 & 11: Already-triggered token is handled safely (now triggers again for replay detection)
    events_dup = await HoneyTokenService.detect_triggers(db, uuid.UUID(agent_id), content_with_token)
    assert len(events_dup) == 1  # Phase 3: Replays are now logged

@pytest.mark.asyncio
async def test_trigger_detection_edge_cases(admin_client: AsyncClient, db_session):
    agent_resp = await admin_client.post("/api/v1/agents", json={"name": "Edge Case Agent"})
    agent_id = agent_resp.json()["id"]

    token_resp = await admin_client.post("/api/v1/honeytokens", json={"agent_id": agent_id, "scope": "db"})
    token_val = token_resp.json()["value"]

    db = db_session
    # Test 5: Unknown token does nothing
    events_unknown = await HoneyTokenService.detect_triggers(db, uuid.UUID(agent_id), "tok_invalid12345")
    assert len(events_unknown) == 0
    
    # Test 6: Empty input is handled safely
    events_empty = await HoneyTokenService.detect_triggers(db, uuid.UUID(agent_id), "")
    assert len(events_empty) == 0
    
    # Test 7: Wrong Agent context does not trigger another Agent's token
    wrong_agent_id = uuid.uuid4()
    events_wrong_agent = await HoneyTokenService.detect_triggers(db, wrong_agent_id, token_val)
    assert len(events_wrong_agent) == 0
