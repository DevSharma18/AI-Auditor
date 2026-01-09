from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from collections import Counter

from .database import get_db
from .models import AuditFinding, AuditRun, AIModel

router = APIRouter(prefix="/metrics", tags=["Metrics"])

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

# -------------------------------------------------
# BIAS METRICS (MATCHES BiasPage.tsx)
# -------------------------------------------------
@router.get("/bias")
def bias_metrics(
    model_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(AuditFinding)
        .join(AuditRun)
        .join(AIModel)
        .filter(AuditFinding.category == "bias")
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    findings = q.all()

    severity_counts = Counter(f.severity for f in findings)

    # UI expects these fields
    total_bias_issues = len(findings)
    models_with_bias = len(
        {
            f.audit_run.model_id
            for f in findings
        }
    )

    bias_distribution = [
        {"label": sev, "value": severity_counts.get(sev, 0)}
        for sev in SEVERITY_ORDER
    ]

    severity_data = [
        {"label": sev, "value": severity_counts.get(sev, 0)}
        for sev in SEVERITY_ORDER
    ]

    return {
        "totalModelsAnalyzed": db.query(AIModel).count(),
        "modelsWithBias": models_with_bias,
        "totalBiasIssues": total_bias_issues,
        "biasDistribution": bias_distribution,
        "severityData": severity_data,
    }


# -------------------------------------------------
# HALLUCINATION METRICS
# -------------------------------------------------
@router.get("/hallucination")
def hallucination_metrics(
    model_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(AuditFinding)
        .join(AuditRun)
        .join(AIModel)
        .filter(AuditFinding.category == "hallucination")
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    findings = q.all()
    severity_counts = Counter(f.severity for f in findings)

    return {
        "total": len(findings),
        "by_severity": severity_counts,
    }


# -------------------------------------------------
# PII METRICS
# -------------------------------------------------
@router.get("/pii")
def pii_metrics(
    model_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(AuditFinding)
        .join(AuditRun)
        .join(AIModel)
        .filter(AuditFinding.category == "pii")
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    findings = q.all()
    severity_counts = Counter(f.severity for f in findings)

    return {
        "totalLeaks": len(findings),
        "criticalLeaks": severity_counts.get("CRITICAL", 0),
        "bySeverity": severity_counts,
    }


# -------------------------------------------------
# COMPLIANCE METRICS (MATCHES CompliancePage.tsx)
# -------------------------------------------------
@router.get("/compliance")
def compliance_metrics(
    model_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(AuditFinding)
        .join(AuditRun)
        .join(AIModel)
        .filter(AuditFinding.category == "compliance")
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    findings = q.all()
    severity_counts = Counter(f.severity for f in findings)

    critical = severity_counts.get("CRITICAL", 0)
    high = severity_counts.get("HIGH", 0)

    exposure = "LOW"
    if critical > 0:
        exposure = "HIGH"
    elif high > 2:
        exposure = "MEDIUM"

    coverage_score = max(0, 100 - (critical * 20 + high * 10))

    return {
        "complianceCoverageScore": coverage_score,
        "regulatoryExposure": exposure,
        "modelsAtRisk": len(
            {
                f.audit_run.model_id
                for f in findings
            }
        ),
        "totalViolations": len(findings),
        "violationsBySeverity": [
            {"severity": sev, "count": severity_counts.get(sev, 0)}
            for sev in SEVERITY_ORDER
        ],
    }


# -------------------------------------------------
# DRIFT (PHASE 1 PLACEHOLDER)
# -------------------------------------------------
@router.get("/drift")
def drift_metrics():
    return {
        "status": "NOT_IMPLEMENTED",
        "score": None,
    }
