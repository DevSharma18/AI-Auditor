# backend/routes.py

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, Response
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
    AuditMetricScore,
    AuditSummary,
)
from .schemas import ModelResponse, AuditResponse, RegisterModelRequest
from .audit_engine import AuditEngine

from .report_builder import build_structured_report
from .remediation_playbook import explain_category, remediation_steps
from .report_pdf_reportlab import generate_audit_pdf_bytes

router = APIRouter(tags=["Core"])


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


@router.get("/models", response_model=List[ModelResponse])
def list_models(db: Session = Depends(get_db)):
    models = db.query(AIModel).all()
    response: List[ModelResponse] = []

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


@router.post("/audits/model/{model_id}/run", response_model=AuditResponse)
def run_model_audit(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()

    engine = AuditEngine(db)
    audit = engine.run_active_audit(model, policy)

    findings_count = (
        db.query(AuditFinding).filter(AuditFinding.audit_id == audit.id).count()
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

    return [
        {
            "audit_id": a.audit_id,
            "executed_at": a.executed_at.isoformat() if a.executed_at else None,
            "audit_result": a.audit_result,
        }
        for a in audits
    ]


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


@router.get("/audits/{audit_id}/findings")
def get_audit_findings_with_guidance(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    findings = (
        db.query(AuditFinding)
        .filter(AuditFinding.audit_id == audit.id)
        .order_by(AuditFinding.id.asc())
        .all()
    )

    results: List[Dict[str, Any]] = []
    for f in findings:
        results.append(
            {
                "finding_id": f.finding_id,
                "category": f.category,
                "severity": f.severity,
                "metric_name": f.metric_name,
                "description": f.description,
                "prompt_id": getattr(f, "prompt_id", None),
                "interaction_id": getattr(f, "interaction_id", None),
                "explain": explain_category(f.category),
                "remediation": remediation_steps(f.category, f.severity, f.metric_name),
            }
        )

    return results


@router.get("/audits/{audit_id}/findings-grouped")
def get_audit_grouped_findings(audit_id: str, db: Session = Depends(get_db)):
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

    metric_rows = (
        db.query(AuditMetricScore)
        .filter(AuditMetricScore.audit_id == audit.id)
        .order_by(AuditMetricScore.severity_score_100.desc())
        .all()
    )

    metric_scores_payload: List[Dict[str, Any]] = []
    for ms in metric_rows:
        metric_scores_payload.append(
            {
                "metric": ms.metric_name,
                "L": float(ms.likelihood or 0.0),
                "I": float(ms.impact or 0.0),
                "R": float(ms.regulatory_weight or 0.0),
                "S": float(ms.severity_score or 0.0),
                "score_100": float(ms.severity_score_100 or 0.0),
                "band": ms.severity_band or "LOW",
                "w": float(ms.strategic_weight or 1.0),
                "frameworks": ms.framework_breakdown or {},
                "signals": ms.signals or {},
                "alpha": float(ms.alpha or 1.0),
                "beta": float(ms.beta or 1.5),
            }
        )

    summary_row = (
        db.query(AuditSummary)
        .filter(AuditSummary.audit_id == audit.id)
        .first()
    )

    global_risk = {}
    if summary_row and summary_row.metrics_snapshot:
        dyn = (summary_row.metrics_snapshot or {}).get("dynamic_scoring") or {}
        global_risk = {
            "score_100": dyn.get("global_score_100"),
            "band": dyn.get("global_band"),
        }

    audit_payload: Dict[str, Any] = {
        "audit_id": audit.audit_id,
        "model_frontend_id": model.model_id if model else None,
        "model_name": model.name if model else None,
        "audit_type": audit.audit_type,
        "executed_at": audit.executed_at.isoformat() if audit.executed_at else None,
        "execution_status": audit.execution_status,
        "audit_result": audit.audit_result,
    }

    findings_payload: List[Dict[str, Any]] = []
    for f in findings:
        findings_payload.append(
            {
                "finding_id": f.finding_id,
                "category": f.category,
                "severity": f.severity,
                "metric_name": f.metric_name,
                "description": f.description,
                "prompt_id": getattr(f, "prompt_id", None),
                "interaction_id": getattr(f, "interaction_id", None),
                "explain": explain_category(f.category),
                "remediation": remediation_steps(f.category, f.severity, f.metric_name),
            }
        )

    interactions_payload: List[Dict[str, Any]] = [
        {
            "interaction_id": i.id,
            "prompt_id": i.prompt_id,
            "prompt": i.prompt,
            "response": i.response,
            "latency_ms": float(i.latency or 0.0),
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in interactions
    ]

    structured_report = build_structured_report(
        audit=audit_payload,
        findings=findings_payload,
        interactions=interactions_payload,
        metric_scores=metric_scores_payload,
        global_risk=global_risk,
    )

    return structured_report


@router.get("/audits/{audit_id}/download")
def download_audit_report_json(audit_id: str, db: Session = Depends(get_db)):
    report = get_audit_grouped_findings(audit_id=audit_id, db=db)

    return JSONResponse(
        content=report,
        headers={"Content-Disposition": f'attachment; filename="audit_{audit_id}.json"'},
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
