from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .database import get_db
from .models import AIModel, AuditRun, AuditFinding, AuditPolicy, EvidenceSource
from .schemas import ModelResponse, AuditResponse, RegisterModelRequest
from .audit_engine import AuditEngine

router = APIRouter()


# =========================================================
# REGISTER MODEL (PROVIDER-AGNOSTIC)
# =========================================================
@router.post("/models/register-with-connector")
def register_model(payload: RegisterModelRequest, db: Session = Depends(get_db)):

    if "{{PROMPT}}" not in str(payload.request_template):
        raise HTTPException(
            status_code=400,
            detail="request_template must contain {{PROMPT}} placeholder"
        )

    existing = db.query(AIModel).filter(
        AIModel.model_id == payload.model_id
    ).first()

    if existing:
        raise HTTPException(400, "Model already exists")

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
# LIST MODELS
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
@router.post("/audits/model/{model_id}/run", response_model=AuditResponse)
def run_model_audit(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(
        AIModel.model_id == model_id
    ).first()

    if not model:
        raise HTTPException(404, "Model not found")

    policy = db.query(AuditPolicy).filter(
        AuditPolicy.model_id == model.id
    ).first()

    engine = AuditEngine(db)
    audit = engine.run_active_audit(model, policy)

    findings_count = db.query(AuditFinding).filter(
        AuditFinding.audit_id == audit.id
    ).count()

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
