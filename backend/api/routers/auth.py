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

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class FirebaseLoginRequest(BaseModel):
    id_token: str

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

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, response: Response, register_request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new analyst operator account."""
    if len(register_request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    stmt = select(User).where(User.email == register_request.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    salt = bcrypt.gensalt()
    pwd_hash = bcrypt.hashpw(register_request.password.encode('utf-8'), salt).decode('utf-8')
    user = User(
        email=register_request.email,
        password_hash=pwd_hash,
        role="analyst",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    csrf_token = secrets.token_urlsafe(32)
    cookie_flags = _auth_cookie_flags()

    response.set_cookie(key="access_token", value=access_token, httponly=True, **cookie_flags)
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, **cookie_flags)

    return {"message": "Registration successful", "user": {"id": user.id, "email": user.email, "role": user.role}}

@router.post("/firebase-login")
@limiter.limit("10/minute")
async def firebase_login(request: Request, response: Response, fb_req: FirebaseLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate or provision user via Firebase Authentication token."""
    firebase_project_id = os.getenv("FIREBASE_PROJECT_ID")
    if not firebase_project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase authentication is not configured on this server. Please use operator email and password credentials."
        )

    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        decoded_token = fb_auth.verify_id_token(fb_req.id_token)
        email = decoded_token.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Firebase token does not contain a verified email")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase authentication token: {str(e)[:80]}")

    stmt = select(User).where(User.email == email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        dummy_hash = bcrypt.hashpw(secrets.token_urlsafe(32).encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = User(
            email=email,
            password_hash=dummy_hash,
            role="analyst",
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is deactivated")

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    csrf_token = secrets.token_urlsafe(32)
    cookie_flags = _auth_cookie_flags()

    response.set_cookie(key="access_token", value=access_token, httponly=True, **cookie_flags)
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, **cookie_flags)

    return {"message": "Firebase login successful", "user": {"id": user.id, "email": user.email, "role": user.role}}
