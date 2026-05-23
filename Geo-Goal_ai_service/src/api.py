"""Geo-Goal AI Service API — FastAPI application with background worker."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx
from pydantic import BaseModel

from api_client import APIClient
from m2m_client import M2MClient
from state import (
    API_BASE,
    CLIENT_ID,
    CLIENT_SECRET,
    POLL_INTERVAL,
    MODEL_NAME,
    DEVICE,
)
from worker import AnalysisWorker


def get_api_client() -> APIClient:
    m2m = M2MClient(API_BASE, CLIENT_ID, CLIENT_SECRET)
    return APIClient(API_BASE, m2m)


worker_task: Optional[asyncio.Task] = None


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    global worker_task
    import state
    print("[api] Starting AI service...")
    api_client = get_api_client()
    state.worker = AnalysisWorker(
        api_client,
        poll_interval=POLL_INTERVAL,
        model_name=MODEL_NAME,
        device=DEVICE,
    )
    worker_task = asyncio.create_task(state.worker.start())
    print(f"[api] Worker started (poll every {POLL_INTERVAL}s)")
    yield
    print("[api] Shutting down...")
    if state.worker:
        state.worker.stop()
    if worker_task:
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass
    print("[api] Stopped.")


app = FastAPI(
    title="Geo-Goal AI Service",
    version="1.0.0",
    lifespan=lifespan,
)

security = HTTPBearer()


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(
                f"{API_BASE}/auth/user",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            r.raise_for_status()
        except httpx.HTTPStatusError:
            raise HTTPException(status_code=401, detail="Token inválido o expirado")
        except Exception:
            raise HTTPException(status_code=503, detail="No se puede conectar con el backend")

    user: dict = r.json()
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden acceder")

    return user


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    status: str
    worker_running: bool
    current_job: Optional[int] = None
    poll_interval: int
    device: str


class ProcessJobRequest(BaseModel):
    match_id: int
    job_id: int
    video_url: str
    src_pts: list


class JobStatus(BaseModel):
    worker_running: bool
    current_job: Optional[int] = None


# ---------------------------------------------------------------------------
# Dashboard routes (admin web UI)
# ---------------------------------------------------------------------------

from dashboard import router as dashboard_router

app.include_router(dashboard_router)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse)
async def health(_: dict = Depends(require_admin)):
    import state
    w = state.worker
    return HealthResponse(
        status="ok",
        worker_running=w.is_running if w else False,
        current_job=w.current_job if w else None,
        poll_interval=POLL_INTERVAL,
        device=DEVICE,
    )


@app.get("/jobs", response_model=JobStatus)
async def get_jobs_status(_: dict = Depends(require_admin)):
    import state
    w = state.worker
    return JobStatus(
        worker_running=w.is_running if w else False,
        current_job=w.current_job if w else None,
    )


@app.post("/jobs/process")
async def process_job_manually(req: ProcessJobRequest, _: dict = Depends(require_admin)):
    """Manually trigger processing of a specific job."""
    import state
    w = state.worker
    if not w:
        raise HTTPException(status_code=503, detail="Worker not initialized")

    job = {
        "jobId": req.job_id,
        "matchId": req.match_id,
        "videoSupabaseUrl": req.video_url,
        "srcPts": req.src_pts,
    }
    asyncio.create_task(w.process_job(job))
    return {"message": "Job processing started", "jobId": req.job_id}


@app.post("/jobs/poll")
async def force_poll(_: dict = Depends(require_admin)):
    """Force an immediate poll for pending jobs."""
    import state
    w = state.worker
    if not w:
        raise HTTPException(status_code=503, detail="Worker not initialized")

    pending = get_api_client().get_pending_analysis()
    if pending:
        asyncio.create_task(w.process_job(pending[0]))
        return {"message": "Job found and processing started", "jobId": pending[0]["jobId"]}

    return {"message": "No pending jobs found"}
