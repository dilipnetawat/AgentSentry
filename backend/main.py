import os
import logging
from fastapi import FastAPI, Request, status, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from backend.api.routers import agents, ingestion, dashboard, honeytokens, agent_runtime, security_events, alerts, auth, demo, system, playground, policies
from backend.api.deps import limiter

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AgentSentry API",
    description="Security layer for AI Agents",
    version="0.1.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal Server Error"},
    )

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Allow frontend origins, Swagger UI, and Spline 3D assets
    allowed_origins_list = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
    csp_connect = " ".join(allowed_origins_list)
    response.headers["Content-Security-Policy"] = (
        f"default-src 'self'; "
        f"connect-src 'self' {csp_connect} https://prod.spline.design; "
        f"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        f"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        f"img-src 'self' data: https://fastapi.tiangolo.com;"
    )
    return response

# Request size limiting middleware
MAX_REQUEST_SIZE = 1 * 1024 * 1024 # 1MB
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    if "content-length" in request.headers:
        try:
            content_length = int(request.headers["content-length"])
            if content_length > MAX_REQUEST_SIZE:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": "Request entity too large"}
                )
        except ValueError:
            pass
    response = await call_next(request)
    return response

# CORS configuration
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
if "*" in allowed_origins:
    raise ValueError("Wildcard CORS is not allowed with credentials=True")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(ingestion.router)
app.include_router(honeytokens.router)
app.include_router(dashboard.router)
app.include_router(agent_runtime.router)
app.include_router(security_events.router)
app.include_router(alerts.router)
app.include_router(demo.router)
app.include_router(system.router)
app.include_router(playground.router)
app.include_router(policies.router)

@app.get("/health")
def health_check():
    """Basic health check endpoint"""
    return {"status": "ok"}
