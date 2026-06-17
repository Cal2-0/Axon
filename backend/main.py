"""
Axon Backend — FastAPI Entry Point
"""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import init_db
from routers import scan, graph, intel, investigations, cases, logs
from modules.api_health import get_all_health

app = FastAPI(
    title="Axon Security Intelligence API",
    description="Backend for Axon Blockchain Risk Analytics Platform",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173", 
        "http://localhost:5174", "http://127.0.0.1:5174", 
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

# Mount routers
app.include_router(scan.router, prefix="/scan", tags=["Scan"])
app.include_router(graph.router, prefix="/graph", tags=["Graph"])
app.include_router(intel.router, prefix="/intel", tags=["Intelligence"])
app.include_router(investigations.router, prefix="/investigations", tags=["Investigations"])
app.include_router(cases.router, prefix="/cases", tags=["Cases"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": "axon-backend"}

@app.get("/health/apis", tags=["System"])
async def health_apis():
    return await get_all_health()
