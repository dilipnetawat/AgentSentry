import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from backend.models.user import User
import bcrypt
import os

from backend.database import DATABASE_URL

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_user(session: AsyncSession, email: str, role: str, password: str):
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    password_hash = hash_password(password)
    
    if not user:
        print(f"Creating default {role} user: {email}")
        user = User(
            email=email,
            password_hash=password_hash,
            role=role
        )
        session.add(user)
    else:
        print(f"Updating password for existing {role} user: {email}")
        user.password_hash = password_hash
        user.role = role
        
    await session.commit()
    print(f"{role.capitalize()} seeded: {email} / {password}")

async def seed_admin():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        await seed_user(session, "admin@agentsentry.local", "admin", "adminpassword")
        await seed_user(session, "analyst@agentsentry.local", "analyst", "analystpassword")

if __name__ == "__main__":
    asyncio.run(seed_admin())
