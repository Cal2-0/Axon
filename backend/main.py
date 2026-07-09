"""
Axon Backend — FastAPI Entry Point
"""
from dotenv import load_dotenv
load_dotenv()

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter
from database.db import init_db
from routers import scan, graph, intel, investigations, cases, logs, verify, address_formats
from modules.api_health import get_all_health

# ─── LIFESPAN (replaces deprecated @app.on_event) ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Axon Security Intelligence API",
    description="Backend for Axon Blockchain Risk Analytics Platform",
    version="2.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS (tightened: explicit methods and headers only) ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173", 
        "http://localhost:5174", "http://127.0.0.1:5174",
        "https://theaxon.netlify.app", "https://theaxonapp.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
)


# ─── API KEY AUTHENTICATION MIDDLEWARE ────────────────────────────────────────
# Set AXON_API_KEY in .env to require authentication on all endpoints.
# If AXON_API_KEY is not set, authentication is disabled (open access).
# Public endpoints (/health, /docs, /openapi.json) are always open.
AXON_API_KEY = os.environ.get("AXON_API_KEY", "")
PUBLIC_PATHS = {"/health", "/health/apis", "/docs", "/openapi.json", "/redoc"}

@app.middleware("http")
async def api_key_auth(request: Request, call_next):
    if not AXON_API_KEY:
        # No key configured = open access (development mode)
        return await call_next(request)
    
    if request.url.path in PUBLIC_PATHS or request.method == "OPTIONS":
        return await call_next(request)

    provided_key = request.headers.get("X-API-Key", "")
    if provided_key != AXON_API_KEY:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or missing API key. Set X-API-Key header."}
        )
    return await call_next(request)


# Mount routers
app.include_router(scan.router, prefix="/scan", tags=["Scan"])
app.include_router(graph.router, prefix="/graph", tags=["Graph"])
app.include_router(intel.router, prefix="/intel", tags=["Intelligence"])
app.include_router(investigations.router, prefix="/investigations", tags=["Investigations"])
app.include_router(cases.router, prefix="/cases", tags=["Cases"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(verify.router)
app.include_router(address_formats.router, prefix="/address-formats", tags=["Address Formats"])

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": "axon-backend", "version": "2.0.0"}

@app.get("/health/apis", tags=["System"])
async def health_apis():
    return await get_all_health()

