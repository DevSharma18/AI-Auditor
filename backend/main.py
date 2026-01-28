# backend/main.py

from dotenv import load_dotenv
load_dotenv(dotenv_path=".env")

import os
import time
import uuid
import logging
from typing import Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .database import init_db
from .routes import router
from .routes_metrics import router as metrics_router
from .routes_connectors import router as connectors_router
from .routes_dashboard import router as dashboard_router

# ✅ AUTH
from .routes_auth import router as auth_router

# ✅ MODELS (you already have this file)
from .routes_models import router as models_router

# ✅ NEW: AUDITS + INCIDENTS (LIVE)
from .routes_audits import router as audits_router
from .routes_incidents import router as incidents_router

from .scheduler import start_scheduler, stop_scheduler


# -------------------------------------------------
# LOGGING (Enterprise style)
# -------------------------------------------------
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger("ai-auditor")


# -------------------------------------------------
# SIMPLE IN-MEMORY RATE LIMIT
# -------------------------------------------------
RATE_LIMIT_ENABLED = os.environ.get("RATE_LIMIT_ENABLED", "true").lower() == "true"
RATE_LIMIT_RPM = int(os.environ.get("RATE_LIMIT_RPM", "120"))  # per IP per minute
_rate_bucket = {}  # { ip: {window:int, count:int} }


def _rate_limit_ok(ip: str) -> bool:
    now = int(time.time())
    window = now // 60
    state = _rate_bucket.get(ip)

    if state is None or state["window"] != window:
        _rate_bucket[ip] = {"window": window, "count": 1}
        return True

    if state["count"] >= RATE_LIMIT_RPM:
        return False

    state["count"] += 1
    return True


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
        os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000"),
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# ENTERPRISE MIDDLEWARE
# -------------------------------------------------
@app.middleware("http")
async def enterprise_middleware(request: Request, call_next: Callable):
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
    ip = request.client.host if request.client else "unknown"

    if RATE_LIMIT_ENABLED and not _rate_limit_ok(ip):
        return JSONResponse(
            status_code=429,
            content={
                "status": "ERROR",
                "error": "RATE_LIMITED",
                "message": "Too many requests. Please retry later.",
                "request_id": request_id,
            },
            headers={"x-request-id": request_id},
        )

    start = time.time()

    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 2)

        response.headers["x-request-id"] = request_id
        response.headers["x-response-time-ms"] = str(duration_ms)

        logger.info(
            f"{request.method} {request.url.path} ip={ip} request_id={request_id} {response.status_code} {duration_ms}ms"
        )
        return response

    except Exception as exc:
        duration_ms = round((time.time() - start) * 1000, 2)
        logger.exception(
            f"Unhandled exception request_id={request_id} path={request.url.path} ip={ip} {duration_ms}ms error={str(exc)}"
        )

        return JSONResponse(
            status_code=500,
            content={
                "status": "ERROR",
                "error": "INTERNAL_SERVER_ERROR",
                "message": "Something went wrong. Please contact support with request_id.",
                "request_id": request_id,
            },
            headers={"x-request-id": request_id},
        )


# -------------------------------------------------
# ROUTES
# -------------------------------------------------
app.include_router(router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
app.include_router(connectors_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(models_router, prefix="/api")

# ✅ NEW LIVE ROUTES
app.include_router(audits_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")


# -------------------------------------------------
# STARTUP / SHUTDOWN
# -------------------------------------------------
@app.on_event("startup")
def startup_event():
    init_db()
    start_scheduler()
    logger.info("AI Auditor Backend started successfully ✅")


@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()
    logger.info("AI Auditor Backend stopped ✅")


# -------------------------------------------------
# HEALTH CHECKS
# -------------------------------------------------
@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/meta")
def meta():
    return {
        "service": "AI Auditor API",
        "version": "2.0.0",
        "environment": os.environ.get("ENV", "local"),
        "rate_limit_enabled": RATE_LIMIT_ENABLED,
        "rate_limit_rpm": RATE_LIMIT_RPM,
    }


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
