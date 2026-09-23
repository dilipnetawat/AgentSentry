from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import bcrypt
from datetime import datetime, timedelta, timezone
import jwt
import os
import secrets
import uuid

from backend.database import get_db
from backend.models.user import User
from backend.api.deps import get_current_user, SECRET_KEY, ALGORITHM, limiter

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"]
)


class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: str

ACCESS_TOKEN_EXPIRE_MINUTES = 120
COOKIE_MAX_AGE = ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _auth_cookie_flags() -> dict:
    """HttpOnly JWT stays HttpOnly. Secure/SameSite follow the environment.
    Local HTTP cannot persist Secure cookies; production still requires Secure.
    """
    is_production = os.getenv("ENVIRONMENT") == "production"
    return {
        "path": "/",
        "secure": is_production,
        "samesite": "none" if is_production else "lax",
        "max_age": COOKIE_MAX_AGE,
    }


def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, response: Response, login_request: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == login_request.email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    
    if not user:
        print("DEBUG: User not found:", login_request.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
    try:
        if not bcrypt.checkpw(login_request.password.encode('utf-8'), user.password_hash.encode('utf-8')):
            print("DEBUG: Password mismatch")
            raise ValueError()
    except Exception as e:
        print("DEBUG: Exception in checkpw:", type(e), str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
    if not user.is_active:
        print("DEBUG: User inactive")
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # CSRF Token
    csrf_token = secrets.token_urlsafe(32)
    cookie_flags = _auth_cookie_flags()

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        **cookie_flags,
    )

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,  # Must be readable by JS for the double-submit header
        **cookie_flags,
    )

    return {"message": "Login successful", "user": {"id": user.id, "email": user.email, "role": user.role}}

@router.post("/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    cookie_flags = _auth_cookie_flags()
    response.delete_cookie(
        "access_token",
        path=cookie_flags["path"],
        secure=cookie_flags["secure"],
        samesite=cookie_flags["samesite"],
    )
    response.delete_cookie(
        "csrf_token",
        path=cookie_flags["path"],
        secure=cookie_flags["secure"],
        samesite=cookie_flags["samesite"],
    )
    return {"message": "Logged out"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
