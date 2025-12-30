from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from backend.database import get_db
from backend.models import AIModel, EvidenceSource, AuditPolicy, AuditRun, AuditSummary, AuditFinding
from backend.schemas import (
    ModelRegister, ModelResponse, AuditPolicyCreate, AuditPolicyResponse,
    AuditResponse, AuditSummaryResponse, FindingResponse,
    DashboardOverview, ModelDashboard
)
from backend.audit_engine import AuditEngine

router = APIRouter()


@router.post("/models/register", response_model=ModelResponse, tags=["Models"])
def register_model(model_data: ModelRegister, db: Session = Depends(get_db)):
    existing = db.query(AIModel).filter(AIModel.model_id == model_data.model_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Model with this ID already exists")
    
    model = AIModel(
        model_id=model_data.model_id,
        name=model_data.name,
        version=model_data.version,
        model_type=model_data.model_type,
        connection_type=model_data.connection_type,
        created_at=datetime.utcnow()
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    
    default_policy = AuditPolicy(
        model_id=model.id,
        audit_frequency="daily",
        baseline_strategy="previous_audit",
        audit_scope={"drift": True, "bias": True, "risk": True, "compliance": True, "active_security": False},
        active_audit_enabled=False
    )
    db.add(default_policy)
    db.commit()
    
    return model


@router.get("/models", response_model=List[ModelResponse], tags=["Models"])
def get_models(db: Session = Depends(get_db)):
    models = db.query(AIModel).all()
    
    result = []
    for model in models:
        last_audit = (
            db.query(AuditRun)
            .filter(AuditRun.model_id == model.id)
            .order_by(AuditRun.executed_at.desc())
            .first()
        )
        
        policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()
        
        model_response = ModelResponse(
            id=model.id,
            model_id=model.model_id,
            name=model.name,
            version=model.version,
            model_type=model.model_type,
            connection_type=model.connection_type,
            created_at=model.created_at,
            last_audit_status=last_audit.audit_result if last_audit else None,
            last_audit_time=last_audit.executed_at if last_audit else None,
            audit_frequency=policy.audit_frequency if policy else None
        )
        result.append(model_response)
    
    return result


@router.get("/models/{model_id}", response_model=ModelResponse, tags=["Models"])
def get_model(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    last_audit = (
        db.query(AuditRun)
        .filter(AuditRun.model_id == model.id)
        .order_by(AuditRun.executed_at.desc())
        .first()
    )
    
    policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()
    
    return ModelResponse(
        id=model.id,
        model_id=model.model_id,
        name=model.name,
        version=model.version,
        model_type=model.model_type,
        connection_type=model.connection_type,
        created_at=model.created_at,
        last_audit_status=last_audit.audit_result if last_audit else None,
        last_audit_time=last_audit.executed_at if last_audit else None,
        audit_frequency=policy.audit_frequency if policy else None
    )


@router.delete("/models/{model_id}", tags=["Models"])
def delete_model(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    db.delete(model)
    db.commit()
    return {"message": "Model deleted successfully"}


@router.post("/audit-policies", response_model=AuditPolicyResponse, tags=["Audit Policies"])
def create_audit_policy(policy_data: AuditPolicyCreate, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.id == policy_data.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    existing = db.query(AuditPolicy).filter(AuditPolicy.model_id == policy_data.model_id).first()
    if existing:
        existing.audit_frequency = policy_data.audit_frequency
        existing.baseline_strategy = policy_data.baseline_strategy
        existing.audit_scope = policy_data.audit_scope
        existing.policy_reference = policy_data.policy_reference
        existing.active_audit_enabled = policy_data.active_audit_enabled
        db.commit()
        db.refresh(existing)
        return existing
    
    policy = AuditPolicy(**policy_data.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.get("/audit-policies", response_model=List[AuditPolicyResponse], tags=["Audit Policies"])
def get_audit_policies(db: Session = Depends(get_db)):
    return db.query(AuditPolicy).all()


@router.get("/audits", response_model=List[AuditResponse], tags=["Audits"])
def get_audits(db: Session = Depends(get_db)):
    audits = db.query(AuditRun).order_by(AuditRun.executed_at.desc()).limit(100).all()
    
    result = []
    for audit in audits:
        model = db.query(AIModel).filter(AIModel.id == audit.model_id).first()
        summary = db.query(AuditSummary).filter(AuditSummary.audit_id == audit.id).first()
        findings_count = db.query(AuditFinding).filter(AuditFinding.audit_id == audit.id).count()
        
        audit_response = AuditResponse(
            id=audit.id,
            audit_id=audit.audit_id,
            model_id=audit.model_id,
            model_name=model.name if model else None,
            audit_type=audit.audit_type,
            scheduled_at=audit.scheduled_at,
            executed_at=audit.executed_at,
            execution_status=audit.execution_status,
            audit_result=audit.audit_result,
            summary=AuditSummaryResponse(
                drift_score=summary.drift_score,
                bias_score=summary.bias_score,
                risk_score=summary.risk_score,
                total_findings=summary.total_findings,
                critical_findings=summary.critical_findings,
                high_findings=summary.high_findings
            ) if summary else None,
            findings_count=findings_count
        )
        result.append(audit_response)
    
    return result


@router.get("/audits/{audit_id}", response_model=AuditResponse, tags=["Audits"])
def get_audit(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    model = db.query(AIModel).filter(AIModel.id == audit.model_id).first()
    summary = db.query(AuditSummary).filter(AuditSummary.audit_id == audit.id).first()
    findings_count = db.query(AuditFinding).filter(AuditFinding.audit_id == audit.id).count()
    
    return AuditResponse(
        id=audit.id,
        audit_id=audit.audit_id,
        model_id=audit.model_id,
        model_name=model.name if model else None,
        audit_type=audit.audit_type,
        scheduled_at=audit.scheduled_at,
        executed_at=audit.executed_at,
        execution_status=audit.execution_status,
        audit_result=audit.audit_result,
        summary=AuditSummaryResponse(
            drift_score=summary.drift_score,
            bias_score=summary.bias_score,
            risk_score=summary.risk_score,
            total_findings=summary.total_findings,
            critical_findings=summary.critical_findings,
            high_findings=summary.high_findings
        ) if summary else None,
        findings_count=findings_count
    )


@router.get("/audits/model/{model_id}", response_model=List[AuditResponse], tags=["Audits"])
def get_model_audits(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    audits = (
        db.query(AuditRun)
        .filter(AuditRun.model_id == model.id)
        .order_by(AuditRun.executed_at.desc())
        .all()
    )
    
    result = []
    for audit in audits:
        summary = db.query(AuditSummary).filter(AuditSummary.audit_id == audit.id).first()
        findings_count = db.query(AuditFinding).filter(AuditFinding.audit_id == audit.id).count()
        
        result.append(AuditResponse(
            id=audit.id,
            audit_id=audit.audit_id,
            model_id=audit.model_id,
            model_name=model.name,
            audit_type=audit.audit_type,
            scheduled_at=audit.scheduled_at,
            executed_at=audit.executed_at,
            execution_status=audit.execution_status,
            audit_result=audit.audit_result,
            summary=AuditSummaryResponse(
                drift_score=summary.drift_score,
                bias_score=summary.bias_score,
                risk_score=summary.risk_score,
                total_findings=summary.total_findings,
                critical_findings=summary.critical_findings,
                high_findings=summary.high_findings
            ) if summary else None,
            findings_count=findings_count
        ))
    
    return result


@router.get("/findings", response_model=List[FindingResponse], tags=["Findings"])
def get_findings(db: Session = Depends(get_db)):
    return db.query(AuditFinding).order_by(AuditFinding.id.desc()).limit(100).all()


@router.get("/findings/{audit_id}", response_model=List[FindingResponse], tags=["Findings"])
def get_audit_findings(audit_id: str, db: Session = Depends(get_db)):
    audit = db.query(AuditRun).filter(AuditRun.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    return db.query(AuditFinding).filter(AuditFinding.audit_id == audit.id).all()


@router.get("/dashboard/overview", response_model=DashboardOverview, tags=["Dashboard"])
def get_dashboard_overview(db: Session = Depends(get_db)):
    total_models = db.query(AIModel).count()
    total_audits = db.query(AuditRun).count()
    
    if total_audits == 0:
        return DashboardOverview(
            total_models=total_models,
            total_audits=0,
            passed_audits=0,
            failed_audits=0,
            critical_findings_count=0,
            high_findings_count=0,
            overall_risk_score=None,
            audit_status_distribution={
                "AUDIT_PASS": 0,
                "AUDIT_WARN": 0,
                "AUDIT_FAIL": 0,
                "BASELINE_CREATED": 0,
                "NO_EVIDENCE": 0
            },
            drift_score_percentage=None,
            has_data=False,
            status_message="No audits executed yet" if total_models > 0 else "No models registered yet"
        )
    
    passed_audits = db.query(AuditRun).filter(AuditRun.audit_result == "AUDIT_PASS").count()
    failed_audits = db.query(AuditRun).filter(AuditRun.audit_result == "AUDIT_FAIL").count()
    
    critical_findings = db.query(AuditFinding).filter(AuditFinding.severity == "CRITICAL").count()
    high_findings = db.query(AuditFinding).filter(AuditFinding.severity == "HIGH").count()
    
    avg_risk = db.query(func.avg(AuditSummary.risk_score)).filter(AuditSummary.risk_score.isnot(None)).scalar()
    avg_drift = db.query(func.avg(AuditSummary.drift_score)).filter(AuditSummary.drift_score.isnot(None)).scalar()
    
    pass_count = db.query(AuditRun).filter(AuditRun.audit_result == "AUDIT_PASS").count()
    warn_count = db.query(AuditRun).filter(AuditRun.audit_result == "AUDIT_WARN").count()
    fail_count = db.query(AuditRun).filter(AuditRun.audit_result == "AUDIT_FAIL").count()
    baseline_count = db.query(AuditRun).filter(AuditRun.audit_result == "BASELINE_CREATED").count()
    no_evidence_count = db.query(AuditRun).filter(AuditRun.audit_result == "NO_EVIDENCE").count()
    
    has_real_audits = (pass_count + warn_count + fail_count) > 0
    
    if not has_real_audits:
        if baseline_count > 0:
            status_message = "Baseline established, waiting for comparison audits"
        elif no_evidence_count > 0:
            status_message = "No evidence found in audit windows"
        else:
            status_message = "Audits pending"
    else:
        status_message = "Real-time metrics computed from audit data"
    
    return DashboardOverview(
        total_models=total_models,
        total_audits=total_audits,
        passed_audits=passed_audits,
        failed_audits=failed_audits,
        critical_findings_count=critical_findings,
        high_findings_count=high_findings,
        overall_risk_score=round(avg_risk, 2) if avg_risk is not None else None,
        audit_status_distribution={
            "AUDIT_PASS": pass_count,
            "AUDIT_WARN": warn_count,
            "AUDIT_FAIL": fail_count,
            "BASELINE_CREATED": baseline_count,
            "NO_EVIDENCE": no_evidence_count
        },
        drift_score_percentage=round(avg_drift, 2) if avg_drift is not None else None,
        has_data=has_real_audits,
        status_message=status_message
    )


@router.get("/dashboard/model/{model_id}", response_model=ModelDashboard, tags=["Dashboard"])
def get_model_dashboard(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    total_audits = db.query(AuditRun).filter(AuditRun.model_id == model.id).count()
    
    if total_audits == 0:
        return ModelDashboard(
            model_id=model.model_id,
            model_name=model.name,
            model_version=model.version,
            connection_type=model.connection_type,
            total_audits=0,
            passed_audits=0,
            failed_audits=0,
            last_audit_status=None,
            last_audit_time=None,
            avg_drift_score=None,
            avg_bias_score=None,
            avg_risk_score=None,
            recent_findings=[],
            baseline_established=False,
            status_message="No audits executed yet"
        )
    
    passed = db.query(AuditRun).filter(AuditRun.model_id == model.id, AuditRun.audit_result == "AUDIT_PASS").count()
    failed = db.query(AuditRun).filter(AuditRun.model_id == model.id, AuditRun.audit_result == "AUDIT_FAIL").count()
    
    last_audit = (
        db.query(AuditRun)
        .filter(AuditRun.model_id == model.id)
        .order_by(AuditRun.executed_at.desc())
        .first()
    )
    
    summaries = (
        db.query(AuditSummary)
        .join(AuditRun)
        .filter(AuditRun.model_id == model.id)
        .all()
    )
    
    drift_scores = [s.drift_score for s in summaries if s.drift_score is not None]
    bias_scores = [s.bias_score for s in summaries if s.bias_score is not None]
    risk_scores = [s.risk_score for s in summaries if s.risk_score is not None]
    
    avg_drift = sum(drift_scores) / len(drift_scores) if drift_scores else None
    avg_bias = sum(bias_scores) / len(bias_scores) if bias_scores else None
    avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else None
    
    baseline_audit = db.query(AuditRun).filter(
        AuditRun.model_id == model.id,
        AuditRun.audit_result.in_(["BASELINE_CREATED", "AUDIT_PASS", "AUDIT_WARN"])
    ).first()
    baseline_established = baseline_audit is not None
    
    recent_findings = (
        db.query(AuditFinding)
        .join(AuditRun)
        .filter(AuditRun.model_id == model.id)
        .order_by(AuditFinding.id.desc())
        .limit(10)
        .all()
    )
    
    if not baseline_established:
        status_message = "Baseline not established"
    elif avg_drift is None and avg_bias is None and avg_risk is None:
        status_message = "Awaiting comparison audits"
    else:
        status_message = "Real-time metrics computed from audit data"
    
    return ModelDashboard(
        model_id=model.model_id,
        model_name=model.name,
        model_version=model.version,
        connection_type=model.connection_type,
        total_audits=total_audits,
        passed_audits=passed,
        failed_audits=failed,
        last_audit_status=last_audit.audit_result if last_audit else None,
        last_audit_time=last_audit.executed_at if last_audit else None,
        avg_drift_score=round(avg_drift, 2) if avg_drift is not None else None,
        avg_bias_score=round(avg_bias, 2) if avg_bias is not None else None,
        avg_risk_score=round(avg_risk, 2) if avg_risk is not None else None,
        recent_findings=[FindingResponse.model_validate(f) for f in recent_findings],
        baseline_established=baseline_established,
        status_message=status_message
    )


@router.post("/audits/trigger/{model_id}", response_model=AuditResponse, tags=["Audits"])
def trigger_audit(model_id: str, db: Session = Depends(get_db)):
    model = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    policy = db.query(AuditPolicy).filter(AuditPolicy.model_id == model.id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No audit policy found for model")
    
    engine = AuditEngine(db)
    audit = engine.run_passive_audit(model, policy)
    
    summary = db.query(AuditSummary).filter(AuditSummary.audit_id == audit.id).first()
    findings_count = db.query(AuditFinding).filter(AuditFinding.audit_id == audit.id).count()
    
    return AuditResponse(
        id=audit.id,
        audit_id=audit.audit_id,
        model_id=audit.model_id,
        model_name=model.name,
        audit_type=audit.audit_type,
        scheduled_at=audit.scheduled_at,
        executed_at=audit.executed_at,
        execution_status=audit.execution_status,
        audit_result=audit.audit_result,
        summary=AuditSummaryResponse(
            drift_score=summary.drift_score,
            bias_score=summary.bias_score,
            risk_score=summary.risk_score,
            total_findings=summary.total_findings,
            critical_findings=summary.critical_findings,
            high_findings=summary.high_findings
        ) if summary else None,
        findings_count=findings_count
    )
