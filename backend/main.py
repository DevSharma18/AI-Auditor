from dotenv import load_dotenv
load_dotenv(dotenv_path=".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .database import init_db
from .routes import router
from .routes_metrics import router as metrics_router
from .scheduler import start_scheduler, stop_scheduler

# -------------------------------------------------
# FASTAPI APP
# -------------------------------------------------
app = FastAPI(
    title="AI Auditor API",
    description="Backend API for AI Model Auditing Platform - Real-Time Evidence-Driven",
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

# -------------------------------------------------
# CORS
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# ROUTES
# -------------------------------------------------
app.include_router(router, prefix="/api")
app.include_router(metrics_router, prefix="/api")

# -------------------------------------------------
# STARTUP / SHUTDOWN
# -------------------------------------------------
@app.on_event("startup")
def startup_event():
    init_db()
    start_scheduler()

@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()

# -------------------------------------------------
# HEALTH CHECK
# -------------------------------------------------
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# -------------------------------------------------
# LOCAL RUN
# -------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
