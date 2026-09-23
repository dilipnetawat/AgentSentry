import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.database import Base, get_db

# Use an in-memory SQLite database for testing to avoid requiring Docker Postgres locally
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

from backend.models.user import User
import uuid
import bcrypt
from datetime import timedelta

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession):
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        password_hash=hash_password("password"),
        role="admin"
    )
    db_session.add(user)
    await db_session.commit()
    return user

@pytest_asyncio.fixture
async def analyst_user(db_session: AsyncSession):
    user = User(
        id=uuid.uuid4(),
        email="analyst@test.com",
        password_hash=hash_password("password"),
        role="analyst"
    )
    db_session.add(user)
    await db_session.commit()
    return user

def _get_auth_client(app, user):
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    
    # Create token
    from backend.api.routers.auth import create_access_token
    token = create_access_token(data={"sub": str(user.id), "role": user.role}, expires_delta=timedelta(minutes=60))
    
    # Set cookies
    client.cookies.set("access_token", token)
    client.cookies.set("csrf_token", "test-csrf-token")
    client.headers["x-csrf-token"] = "test-csrf-token"
    return client

@pytest_asyncio.fixture
async def admin_client(admin_user):
    client = _get_auth_client(app, admin_user)
    yield client
    await client.aclose()

@pytest_asyncio.fixture
async def analyst_client(analyst_user):
    client = _get_auth_client(app, analyst_user)
    yield client
    await client.aclose()

@pytest_asyncio.fixture
async def unauth_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

# For legacy tests, we map async_client to analyst_client by default.
# Analyst can create agents they own, and do ingestion/isolation.
# For admin-only actions (like honeytokens), we explicitly use admin_client.
@pytest_asyncio.fixture
async def async_client(analyst_client):
    yield analyst_client
