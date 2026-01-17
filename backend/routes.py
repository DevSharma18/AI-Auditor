from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from .database import get_db
from .models import (
    AIModel,
    AuditRun,
    AuditFinding,
    AuditPolicy,
    EvidenceSource,
    AuditInteraction,
)
from .schemas import ModelResponse, AuditResponse, RegisterModelRequest
from .audit_engine import AuditEngine

router = APIRouter()


# =========================================================
# REGISTER MODEL (PROVIDER-AGNOSTIC)
# =========================================================
@router.post("/models/register-with-connector")
def register_model(payload: RegisterModelRequest, db: Session = Depends(get_db)):

    # Must include placeholder so prompts can be injected dynamically
    if "{{PROMPT}}" not in str(payload.request_template):
        raise HTTPException(
            status_code=400,
            detail="request_template must contain {{PROMPT}} placeholder"
        )

    existing = db.query(AIModel).filter(AIModel.model_id == payload.model_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Model already exists")

    model = AIModel(
        model_id=payload.model_id,
        name=payload.name,
        model_type="llm",
        connection_type="api",
    )

    db.add(model)
    db.flush()

    evidence = EvidenceSource(
        model_id=model.id,
        source_type="api",
        config={
            "endpoint": payload.endpoint,
            "method": payload.method,
            "headers": payload.headers,
            "request_template": payload.request_template,
            "response_path": payload.response_path,
        },
    )

    db.add(evidence)
    db.commit()

    return {"status": "registered"}


# =========================================================
# LIST MODELS (ALWAYS RETURNS ARRAY)
# =========================================================
@router.get("/models", response_model=List[ModelResponse])
def list_models(db: Session = Depends(get_db)):
    models = db.query(AIModel).all()
    response = []

    for model in models:
        last_audit = (
            db.query(AuditRun)
            .filter(AuditRun.model_id == model.id)
            .order_by(AuditRun.executed_at.desc())
            .first()
        )

        response.append(
            ModelResponse(
                id=model.id,
                model_id=model.model_id,
                name=model.name,
                version=model.version,
                model_type=model.model_type,
                connection_type=model.connection_type,
                created_at=model.created_at,
                last_audit_status=last_audit.audit_result if last_audit else None,
                last_audit_time=last_audit.executed_at if last_audit else None,
                audit_frequency="manual",
            )
        )

    return response


# =========================================================
# RUN AUDIT (ACTIVE)
# =========================================================
@router.post("/audits/model/{model_id}/run", response_model=AuditResponse)
def run_model_audit(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()

    engine = AuditEngine(db)
    audit = engine.run_active_audit(model, policy)

    findings_count = (
        db.query(AuditFinding)
        .filter(AuditFinding.audit_id == audit.id)
        .count()
    )

    return AuditResponse(
        id=audit.id,
        audit_id=audit.audit_id,
        model_id=audit.model_id,
        audit_type=audit.audit_type,
        executed_at=audit.executed_at,
        execution_status=audit.execution_status,
        audit_result=audit.audit_result,
        findings_count=findings_count,
    )


# =========================================================
# RECENT AUDITS FOR A MODEL  ✅ FIXES YOUR "detail not found"
# =========================================================
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

    # Frontend expects executed_at to be string (your page.tsx uses new Date())
    return [
        {
            "audit_id": a.audit_id,
            "executed_at": a.executed_at.isoformat(),
            "audit_result": a.audit_result,
        }
        for a in audits
    ]


# =========================================================
# GET INTERACTIONS FOR AN AUDIT ✅ supports AuditDetailPage
# /api/audits/{audit_id}/interactions
# =========================================================
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
            "prompt_id": r.prompt_id,
            "prompt": r.prompt,
            "response": r.response,
            "latency": r.latency,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


# =========================================================
# DOWNLOAD FULL AUDIT REPORT JSON ✅ supports Download Button
# /api/audits/{audit_id}/download
# =========================================================
@router.get("/audits/{audit_id}/download")
def download_audit_report(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    model = db.query(AIModel).filter(AIModel.id == audit.model_id).first()

    findings = (
        db.query(AuditFinding)
        .filter(AuditFinding.audit_id == audit.id)
        .order_by(AuditFinding.id.asc())
        .all()
    )

    interactions = (
        db.query(AuditInteraction)
        .filter(AuditInteraction.audit_id == audit.id)
        .order_by(AuditInteraction.created_at.asc())
        .all()
    )

    report: Dict[str, Any] = {
        "audit": {
            "audit_id": audit.audit_id,
            "model_internal_id": audit.model_id,
            "model_frontend_id": model.model_id if model else None,
            "model_name": model.name if model else None,
            "audit_type": audit.audit_type,
            "executed_at": audit.executed_at.isoformat() if audit.executed_at else None,
            "execution_status": audit.execution_status,
            "audit_result": audit.audit_result,
        },
        "findings": [
            {
                "finding_id": f.finding_id,
                "category": f.category,
                "severity": f.severity,
                "metric_name": f.metric_name,
                "description": f.description,
            }
            for f in findings
        ],
        "interactions": [
            {
                "prompt_id": i.prompt_id,
                "prompt": i.prompt,
                "response": i.response,
                "latency_ms": i.latency,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in interactions
        ],
        "counts": {
            "findings_total": len(findings),
            "interactions_total": len(interactions),
        },
    }

    # This will open as JSON in browser (your frontend already uses window.open())
    return JSONResponse(
        content=report,
        headers={
            "Content-Disposition": f'attachment; filename="{audit.audit_id}.json"'
        },
    )
