from __future__ import annotations

from datetime import datetime
import logging
import uuid
import threading
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from .database import get_db, SessionLocal
from .models import (
    AIModel,
    AuditRun,
    AuditFinding,
    AuditPolicy,
    EvidenceSource,
    AuditInteraction,
    AuditMetricScore,
    AuditSummary,
    ExecutionStatus
)
from .schemas import ModelResponse, AuditResponse, RegisterModelRequest
from .audit_engine import AuditEngine

from .report_builder import build_structured_report
from .remediation_playbook import explain_category, remediation_steps
from .report_pdf_reportlab import generate_audit_pdf_bytes

logger = logging.getLogger("ai-auditor")

router = APIRouter(tags=["Core"])

# ✅ Enterprise Registry: Tracking active background tasks for cancellation
active_audit_tasks: Dict[str, threading.Event] = {}


# =========================================================
# Background runner (Enterprise Managed)
# =========================================================

def _run_audit_background(model_id: str, audit_public_id: str, cancel_event: threading.Event):
    db: Session = SessionLocal()
    try:
        logger.info(f"Background audit START model_id={model_id} audit_id={audit_public_id}")

        model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
        audit_row = db.query(AuditRun).filter(AuditRun.audit_id == audit_public_id).first()
        
        if not model or not audit_row:
            logger.warning(f"Background audit: Model/Audit not found for {audit_public_id}")
            return

        policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()
        engine = AuditEngine(db)

        engine.run_active_audit(model, policy, audit_public_id, cancel_event=cancel_event)
        logger.info(f"Background audit END model_id={model_id} audit_id={audit_public_id}")

    except Exception as exc:
        logger.exception(f"Background audit failed audit_id={audit_public_id}: {exc}")
        try:
            audit_row = db.query(AuditRun).filter(AuditRun.audit_id == audit_public_id).first()
            if audit_row and audit_row.execution_status != "CANCELLED":
                audit_row.execution_status = "FAILED"
                audit_row.audit_result = "FAILED"
                db.commit()
        except Exception:
            db.rollback()
    finally:
        active_audit_tasks.pop(audit_public_id, None)
        db.close()


# =========================================================
# Models
# =========================================================

@router.post("/models/register-with-connector")
def register_model(payload: RegisterModelRequest, db: Session = Depends(get_db)):
    if "{{PROMPT}}" not in str(payload.request_template):
        raise HTTPException(
            status_code=400,
            detail="request_template must contain {{PROMPT}} placeholder",
        )

    existing = db.query(AIModel).filter(AIModel.model_id == payload.model_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Model already exists")

    model = AIModel(
        model_id=payload.model_id,
        name=payload.name,
        model_type="llm",
        connection_type="api",
        description=getattr(payload, "description", None),
    )

    db.add(model)
    db.flush()

    evidence = EvidenceSource(
        model_id=model.id,
        source_type="api",
        config={
            "endpoint": payload.endpoint,
            "method": getattr(payload, "method", "POST"),
            "headers": payload.headers,
            "request_template": payload.request_template,
            "response_path": payload.response_path,
        },
    )

    db.add(evidence)
    db.commit()

    return {"status": "OK", "message": "registered"}


@router.get("/models", response_model=List[ModelResponse])
def list_models(db: Session = Depends(get_db)):
    models_list = db.query(AIModel).all()
    response: List[ModelResponse] = []

    for model in models_list:
        last_audit = (
            db.query(AuditRun)
            .filter(AuditRun.model_id == model.id)
            .order_by(AuditRun.executed_at.desc())
            .first()
        )

        last_status = None
        last_time = None
        if last_audit:
            last_time = last_audit.executed_at
            if last_audit.execution_status in ["RUNNING", "FAILED", "PENDING", "CANCELLED"]:
                last_status = last_audit.execution_status
            else:
                last_status = last_audit.audit_result

        response.append(
            ModelResponse(
                id=model.id,
                model_id=model.model_id,
                name=model.name,
                version=model.version,
                model_type=model.model_type,
                connection_type=model.connection_type,
                created_at=model.created_at,
                last_audit_status=last_status,
                last_audit_time=last_time,
                audit_frequency="manual",
            )
        )

    return response


# =========================================================
# Audits
# =========================================================

@router.post("/audits/model/{model_id}/run", response_model=AuditResponse)
def run_model_audit(
    model_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    ongoing = db.query(AuditRun).filter(
        AuditRun.model_id == model.id, 
        AuditRun.execution_status == "RUNNING"
    ).first()
    if ongoing:
        raise HTTPException(status_code=400, detail=f"Audit {ongoing.audit_id} is already running.")

    evidence = (
        db.query(EvidenceSource)
        .filter(EvidenceSource.model_id == model.id, EvidenceSource.source_type == "api")
        .first()
    )
    if not evidence:
        raise HTTPException(
            status_code=400,
            detail="NO_EVIDENCE: EvidenceSource not configured for this model",
        )

    audit_public_id = f"active_{uuid.uuid4().hex[:12]}"

    audit = AuditRun(
        audit_id=audit_public_id,
        model_id=model.id,
        audit_type="active",
        executed_at=datetime.utcnow(),
        execution_status="PENDING",
        audit_result="PENDING",
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    cancel_event = threading.Event()
    active_audit_tasks[audit_public_id] = cancel_event

    background_tasks.add_task(_run_audit_background, model_id, audit_public_id, cancel_event)

    return AuditResponse(
        id=audit.id,
        audit_id=audit.audit_id,
        model_id=audit.model_id,
        audit_type=audit.audit_type,
        executed_at=audit.executed_at,
        execution_status=audit.execution_status,
        audit_result=audit.audit_result,
        findings_count=0
    )


@router.post("/audits/{audit_id}/stop")
def stop_audit(audit_id: str, db: Session = Depends(get_db)):
    """
    ✅ Robust Stop: Handles 'Zombies' (running in DB but missing from memory)
    """
    # 1. Try to signal the active thread
    event = active_audit_tasks.get(audit_id)
    if event:
        event.set()
        logger.info(f"Signal sent to in-memory task {audit_id}")
    else:
        logger.warning(f"Stop requested for {audit_id} but not found in active_audit_tasks. Checking DB...")

    # 2. Force DB update regardless of memory state
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found in database.")

    if audit.execution_status in ["SUCCESS", "FAILED", "CANCELLED"]:
        return {"status": "OK", "message": "Audit was already finished.", "state": audit.execution_status}

    # 3. Mark as CANCELLED (Handles the Zombie case)
    audit.execution_status = "CANCELLED"
    audit.audit_result = "CANCELLED"
    db.commit()
    
    return {"status": "OK", "message": "Audit marked as CANCELLED."}


@router.get("/audits/model/{model_id}/recent")
def recent_model_audits(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    audits = (
        db.query(AuditRun)
        .filter(AuditRun.model_id == model.id)
        .order_by(AuditRun.executed_at.desc())
        .limit(25)
        .all()
    )

    out = []
    for a in audits:
        result = a.audit_result
        if a.execution_status in ["RUNNING", "FAILED", "PENDING", "CANCELLED"]:
            result = a.execution_status

        out.append(
            {
                "audit_id": a.audit_id,
                "executed_at": a.executed_at.isoformat() if a.executed_at else None,
                "audit_result": result,
            }
        )

    return out


@router.get("/audits/{audit_id}/interactions")
def get_audit_interactions(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    rows = (
        db.query(AuditInteraction)
        .filter(AuditInteraction.audit_id == audit.id)
        .order_by(AuditInteraction.created_at.asc())
        .all()
    )

    return [
        {
            "interaction_id": r.id,
            "prompt_id": r.prompt_id,
            "prompt": r.prompt,
            "response": r.response,
            "latency_ms": float(r.latency or 0.0),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/audits/{audit_id}/findings-grouped")
def get_audit_grouped_findings(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    model = db.query(AIModel).filter(AIModel.id == audit.model_id).first()
    findings = db.query(AuditFinding).filter(AuditFinding.audit_id == audit.id).all()
    interactions = db.query(AuditInteraction).filter(AuditInteraction.audit_id == audit.id).all()
    metric_rows = db.query(AuditMetricScore).filter(AuditMetricScore.audit_id == audit.id).all()
    summary_row = db.query(AuditSummary).filter(AuditSummary.audit_id == audit.id).first()

    global_risk = {}
    if summary_row:
        global_risk = {
            "score_100": summary_row.risk_score,
            "band": "N/A"
        }

    audit_payload = {
        "audit_id": audit.audit_id,
        "model_name": model.name if model else "N/A",
        "executed_at": audit.executed_at.isoformat(),
        "execution_status": audit.execution_status,
        "audit_result": audit.audit_result,
    }

    findings_payload = [
        {
            "finding_id": f.finding_id,
            "category": f.category,
            "severity": f.severity,
            "metric_name": f.metric_name,
            "description": f.description,
            "explain": explain_category(f.category),
            "remediation": remediation_steps(f.category, f.severity, f.metric_name),
        }
        for f in findings
    ]

    interactions_payload = [
        {
            "prompt": i.prompt,
            "response": i.response,
            "latency_ms": i.latency
        }
        for i in interactions
    ]

    metric_scores_payload = [
        {
            "metric": ms.metric_name,
            "score_100": ms.severity_score_100,
            "band": ms.severity_band
        }
        for ms in metric_rows
    ]

    return build_structured_report(
        audit=audit_payload,
        findings=findings_payload,
        interactions=interactions_payload,
        metric_scores=metric_scores_payload,
        global_risk=global_risk,
    )


@router.get("/audits/{audit_id}/download-pdf")
def download_audit_report_pdf(audit_id: str, db: Session = Depends(get_db)):
    report = get_audit_grouped_findings(audit_id=audit_id, db=db)
    pdf_bytes = generate_audit_pdf_bytes(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="audit_{audit_id}.pdf"'},
    )