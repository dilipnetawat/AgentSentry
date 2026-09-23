import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.main import app
from backend.models.user import User
from backend.seed_admin import seed_user
import uuid

@pytest.mark.asyncio
async def test_admin_login(unauth_client: AsyncClient, db_session: AsyncSession):
    # Ensure admin user exists with new password
    await seed_user(db_session, "admin@agentsentry.local", "admin", "adminpassword")
    
    response = await unauth_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@agentsentry.local", "password": "adminpassword"}
    )
    assert response.status_code == 200
    assert "access_token" in response.cookies
    assert "csrf_token" in response.cookies
    set_cookies = response.headers.get_list("set-cookie")
    access = next(c for c in set_cookies if c.lower().startswith("access_token="))
    csrf = next(c for c in set_cookies if c.lower().startswith("csrf_token="))
    assert "httponly" in access.lower()
    assert "httponly" not in csrf.lower()
    # Local HTTP (ENVIRONMENT != production) must not set Secure
    assert "secure" not in access.lower()
    assert "samesite=lax" in access.lower()

@pytest.mark.asyncio
async def test_analyst_login(unauth_client: AsyncClient, db_session: AsyncSession):
    # Ensure analyst user exists with new password
    await seed_user(db_session, "analyst@agentsentry.local", "analyst", "analystpassword")
    
    response = await unauth_client.post(
        "/api/v1/auth/login",
        json={"email": "analyst@agentsentry.local", "password": "analystpassword"}
    )
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_login_sets_secure_cookies_in_production(unauth_client: AsyncClient, db_session: AsyncSession, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    await seed_user(db_session, "admin@agentsentry.local", "admin", "adminpassword")
    response = await unauth_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@agentsentry.local", "password": "adminpassword"}
    )
    assert response.status_code == 200
    access = next(c for c in response.headers.get_list("set-cookie") if c.lower().startswith("access_token="))
    assert "secure" in access.lower()
    assert "samesite=none" in access.lower()
    assert "httponly" in access.lower()

@pytest.mark.asyncio
async def test_cors_allows_localhost_frontend(unauth_client: AsyncClient):
    response = await unauth_client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code in (200, 204)
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert response.headers.get("access-control-allow-credentials") == "true"

@pytest.mark.asyncio
async def test_idempotent_seed(db_session: AsyncSession):
    # First seed
    await seed_user(db_session, "testseed@agentsentry.local", "viewer", "pass1")
    user = (await db_session.execute(select(User).where(User.email == "testseed@agentsentry.local"))).scalar_one()
    old_hash = user.password_hash
    
    # Second seed with different password
    await seed_user(db_session, "testseed@agentsentry.local", "viewer", "pass2")
    user = (await db_session.execute(select(User).where(User.email == "testseed@agentsentry.local"))).scalar_one()
    new_hash = user.password_hash
    
    assert old_hash != new_hash
    
    # Third seed with same password, hash changes due to salt, but idempotency of script doesn't duplicate user
    users_count = (await db_session.execute(select(User).where(User.email == "testseed@agentsentry.local"))).scalars().all()
    assert len(users_count) == 1

@pytest.mark.asyncio
async def test_rbac_admin_vs_analyst(admin_client: AsyncClient, analyst_client: AsyncClient):
    # Analyst shouldn't be able to create a honeytoken
    response = await analyst_client.post("/api/v1/honeytokens", json={"agent_id": str(uuid.uuid4()), "scope": "db", "token_type": "api_key"})
    assert response.status_code == 403
    
    # Admin should get 404 (because agent doesn't exist), but NOT 403
    response = await admin_client.post("/api/v1/honeytokens", json={"agent_id": str(uuid.uuid4()), "scope": "db", "token_type": "api_key"})
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_agents_pagination(admin_client: AsyncClient, db_session: AsyncSession):
    # Create a couple of agents
    from backend.models.agent import Agent
    for i in range(3):
        agent = Agent(name=f"Agent {i}", status="active", risk_score=0, owner_id=uuid.uuid4())
        db_session.add(agent)
    await db_session.commit()
    
    response = await admin_client.get("/api/v1/agents?limit=2&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    
    response2 = await admin_client.get("/api/v1/agents?limit=2&offset=2")
    assert response2.status_code == 200
    data2 = response2.json()
    assert len(data2) >= 1
    
    # Enforce maximum
    response3 = await admin_client.get("/api/v1/agents?limit=500")
    assert response3.status_code == 200
    # Should not crash, and shouldn't return 500

@pytest.mark.asyncio
async def test_dashboard_response_correctness(admin_client: AsyncClient):
    response = await admin_client.get("/api/v1/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    
    expected_keys = [
        "total_agents", "active_agents", "isolated_agents", 
        "total_security_events", "open_alerts", "critical_alerts", 
        "blocked_events", "quarantined_events", "honeytoken_triggers"
    ]
    for key in expected_keys:
        assert key in data
        assert isinstance(data[key], int)
