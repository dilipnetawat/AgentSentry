import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_ingest_content_success(analyst_client: AsyncClient):
    # First create an agent
    resp_agent = await analyst_client.post("/api/v1/agents", json={"name": "IngestAgent"})
    agent_id = resp_agent.json()["id"]

    # Now ingest content
    resp_ingest = await analyst_client.post("/api/v1/ingest", json={
        "agent_id": agent_id,
        "content": "This is a test document with untrusted instructions.",
        "source_type": "document",
        "provenance": {"filename": "test.pdf", "author": "unknown"}
    })
    
    assert resp_ingest.status_code == 201
    data = resp_ingest.json()
    assert "id" in data
    assert data["agent_id"] == agent_id
    assert data["source_type"] == "document"
    assert data["status"] == "processed"

@pytest.mark.asyncio
async def test_ingest_content_invalid_agent(analyst_client: AsyncClient):
    import uuid
    resp = await analyst_client.post("/api/v1/ingest", json={
        "agent_id": str(uuid.uuid4()),
        "content": "Test",
        "source_type": "email"
    })
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_ingest_content_isolated_agent(analyst_client: AsyncClient):
    # Create and isolate agent
    resp_agent = await analyst_client.post("/api/v1/agents", json={"name": "BadAgent"})
    agent_id = resp_agent.json()["id"]
    await analyst_client.post(f"/api/v1/agents/{agent_id}/isolate")

    # Try to ingest
    resp = await analyst_client.post("/api/v1/ingest", json={
        "agent_id": agent_id,
        "content": "Test",
        "source_type": "email"
    })
    assert resp.status_code == 400
    assert "cannot accept new ingestions" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_ingest_content_validation(analyst_client: AsyncClient):
    resp_agent = await analyst_client.post("/api/v1/agents", json={"name": "ValidAgent"})
    agent_id = resp_agent.json()["id"]

    # Missing content
    resp = await analyst_client.post("/api/v1/ingest", json={
        "agent_id": agent_id,
        "source_type": "email"
    })
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_ingest_content_oversized(analyst_client: AsyncClient):
    resp_agent = await analyst_client.post("/api/v1/agents", json={"name": "OversizedAgent"})
    agent_id = resp_agent.json()["id"]

    # 100,001 chars
    oversized_content = "A" * 100001
    
    resp = await analyst_client.post("/api/v1/ingest", json={
        "agent_id": agent_id,
        "content": oversized_content,
        "source_type": "document"
    })
    assert resp.status_code == 422
    assert "String should have at most 100000 characters" in resp.text
