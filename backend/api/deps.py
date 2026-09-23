import os
import secrets
import uuid
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import APIKeyCookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import jwt
from typing import Optional
from backend.database import get_db
from backend.models.user import User
from slowapi import Limiter
from slowapi.util import get_remote_address

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-do-not-use-in-production")
if os.getenv("ENVIRONMENT") == "production":
    if JWT_SECRET_KEY == "dev-secret-do-not-use-in-production" or len(JWT_SECRET_KEY) < 32:
        raise ValueError("A secure JWT_SECRET_KEY must be set in production environments.")
SECRET_KEY = JWT_SECRET_KEY

ALGORITHM = "HS256"

limiter = Limiter(key_func=get_remote_address)

# We use an APIKeyCookie to extract the token from the "access_token" cookie
cookie_scheme = APIKeyCookie(name="access_token", auto_error=False)

def verify_csrf_token(request: Request):
    """
    Double Submit Cookie pattern for CSRF protection.
    The frontend reads the 'csrf_token' cookie and sends it in the 'x-csrf-token' header.
    """
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return
        
    csrf_cookie = request.cookies.get("csrf_token")
    csrf_header = request.headers.get("x-csrf-token")
    
    if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token validation failed"
        )

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(cookie_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    # First, verify CSRF token for mutating requests
    verify_csrf_token(request)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = uuid.UUID(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception
        
    stmt = select(User).where(User.id == user_id, User.is_active == True)
    user = (await db.execute(stmt)).scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    return user

def require_role(allowed_roles: list[str]):
    """Dependency to check if current user has required role."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient permissions"
            )
        return current_user
    return role_checker

async def get_admin_user(current_user: User = Depends(require_role(["admin"]))) -> User:
    return current_user

async def get_analyst_user(current_user: User = Depends(require_role(["admin", "analyst"]))) -> User:
    return current_user
