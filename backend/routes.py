from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from .database import get_db
from .models import (
    AIModel,
    AuditRun,
    AuditSummary,
    AuditFinding,
    AuditInteraction,
    AuditPolicy,
)

from .schemas import ModelResponse, AuditResponse
from .audit_engine import AuditEngine

router = APIRouter()

# =========================================================
# MODELS
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
# RUN AUDIT
# =========================================================

@router.post("/audits/model/{model_id}", response_model=AuditResponse)
def run_model_audit(
    model_id: str,
    db: Session = Depends(get_db),
):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(404, "Model not found")

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
# RECENT AUDITS
# =========================================================

@router.get("/audits/model/{model_id}/recent")
def recent_model_audits(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        return []

    audits = (
        db.query(AuditRun)
        .filter(AuditRun.model_id == model.id)
        .order_by(AuditRun.executed_at.desc())
        .limit(10)
        .all()
    )

    return [
        {
            "audit_id": a.audit_id,
            "executed_at": a.executed_at,
            "audit_result": a.audit_result,
        }
        for a in audits
    ]


# =========================================================
# 🔽 DOWNLOAD AUDIT REPORT (JSON)
# =========================================================

@router.get("/audits/{audit_id}/download")
def download_audit_report(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(404, "Audit not found")

    summary = (
        db.query(AuditSummary)
        .filter(AuditSummary.audit_id == audit.id)
        .first()
    )

    findings = (
        db.query(AuditFinding)
        .filter(AuditFinding.audit_id == audit.id)
        .all()
    )

    interactions = (
        db.query(AuditInteraction)
        .filter(AuditInteraction.audit_id == audit.id)
        .all()
    )

    return JSONResponse(
        content={
            "audit_id": audit.audit_id,
            "model_id": audit.model_id,
            "executed_at": audit.executed_at.isoformat(),
            "result": audit.audit_result,
            "summary": {
                "risk_score": summary.risk_score if summary else None,
                "total_findings": summary.total_findings if summary else 0,
                "critical_findings": summary.critical_findings if summary else 0,
                "high_findings": summary.high_findings if summary else 0,
            },
            "findings": [
                {
                    "category": f.category,
                    "severity": f.severity,
                    "metric": f.metric_name,
                    "description": f.description,
                }
                for f in findings
            ],
            "prompt_response_trace": [
                {
                    "prompt_id": i.prompt_id,
                    "prompt": i.prompt,
                    "response": i.response,
                    "latency": i.latency,
                }
                for i in interactions
            ],
        }
    )


# =========================================================
# 🔍 PROMPT–RESPONSE VIEWER
# =========================================================

@router.get("/audits/{audit_id}/interactions")
def get_audit_interactions(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(404, "Audit not found")

    interactions = (
        db.query(AuditInteraction)
        .filter(AuditInteraction.audit_id == audit.id)
        .all()
    )

    return [
        {
            "prompt_id": i.prompt_id,
            "prompt": i.prompt,
            "response": i.response,
            "latency": i.latency,
        }
        for i in interactions
    ]
