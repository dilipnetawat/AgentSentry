import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_agent_registration(admin_client: AsyncClient):
    response = await admin_client.post("/api/v1/agents", json={
        "name": "Test Agent",
        "status": "active",
        "risk_score": 10
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Agent"
    assert "id" in data
    assert data["status"] == "active"

@pytest.mark.asyncio
async def test_invalid_agent_data(admin_client: AsyncClient):
    # Risk score > 100
    response = await admin_client.post("/api/v1/agents", json={
        "name": "Bad Agent",
        "risk_score": 150
    })
    assert response.status_code == 422

    # Missing name
    response = await admin_client.post("/api/v1/agents", json={
        "risk_score": 50
    })
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_agent_isolation_and_restore(admin_client: AsyncClient):
    # Create agent
    resp1 = await admin_client.post("/api/v1/agents", json={"name": "IsolateMe"})
    agent_id = resp1.json()["id"]

    # Isolate
    resp2 = await admin_client.post(f"/api/v1/agents/{agent_id}/isolate")
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "isolated"

    # Restore
    resp3 = await admin_client.post(f"/api/v1/agents/{agent_id}/restore")
    assert resp3.status_code == 200
    assert resp3.json()["status"] == "active"

@pytest.mark.asyncio
async def test_agent_not_found(admin_client: AsyncClient):
    import uuid
    fake_id = str(uuid.uuid4())
    resp = await admin_client.get(f"/api/v1/agents/{fake_id}")
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_list_agents(admin_client: AsyncClient):
    await admin_client.post("/api/v1/agents", json={"name": "A1"})
    await admin_client.post("/api/v1/agents", json={"name": "A2"})
    resp = await admin_client.get("/api/v1/agents")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2

@pytest.mark.asyncio
async def test_isolate_already_isolated_agent(admin_client: AsyncClient):
    resp1 = await admin_client.post("/api/v1/agents", json={"name": "AlreadyIsolated"})
    agent_id = resp1.json()["id"]

    # First isolate
    resp2 = await admin_client.post(f"/api/v1/agents/{agent_id}/isolate")
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "isolated"

    # Second isolate (idempotent)
    resp3 = await admin_client.post(f"/api/v1/agents/{agent_id}/isolate")
    assert resp3.status_code == 200
    assert resp3.json()["status"] == "isolated"

@pytest.mark.asyncio
async def test_isolate_nonexistent_agent(admin_client: AsyncClient):
    import uuid
    fake_id = str(uuid.uuid4())
    resp = await admin_client.post(f"/api/v1/agents/{fake_id}/isolate")
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_isolate_invalid_uuid(admin_client: AsyncClient):
    resp = await admin_client.post("/api/v1/agents/not-a-uuid/isolate")
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_isolation_does_not_affect_unrelated_agents(admin_client: AsyncClient):
    # Agent 1
    resp1 = await admin_client.post("/api/v1/agents", json={"name": "Agent 1"})
    agent1_id = resp1.json()["id"]

    # Agent 2
    resp2 = await admin_client.post("/api/v1/agents", json={"name": "Agent 2"})
    agent2_id = resp2.json()["id"]

    # Isolate Agent 1
    await admin_client.post(f"/api/v1/agents/{agent1_id}/isolate")

    # Agent 2 should still be active
    resp3 = await admin_client.get(f"/api/v1/agents/{agent2_id}")
    assert resp3.status_code == 200
    assert resp3.json()["status"] == "active"
