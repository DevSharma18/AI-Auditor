from dotenv import load_dotenv
load_dotenv(dotenv_path=".env")


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from database import init_db
from routes import router
from scheduler import start_scheduler, stop_scheduler



app = FastAPI(
    title="AI Auditor API",
    description="Backend API for AI Model Auditing Platform - Real-Time Evidence-Driven",
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    init_db()
    start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
