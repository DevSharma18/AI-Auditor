# backend/routes_metrics.py

from __future__ import annotations

from collections import Counter
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .database import get_db
from .models import AIModel, AuditRun, AuditFinding, AuditMetricScore

router = APIRouter(prefix="/metrics", tags=["Metrics"])

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


# =========================================================
# Helpers (new scoring)
# =========================================================

def _fetch_metric_series(db: Session, metric_name: str, model_id: str | None):
    q = (
        db.query(AuditMetricScore, AuditRun, AIModel)
        .join(AuditRun, AuditMetricScore.audit_id == AuditRun.id)
        .join(AIModel, AuditRun.model_id == AIModel.id)
        .filter(AuditMetricScore.metric_name == metric_name)
        .order_by(AuditRun.executed_at.desc())
        .limit(10)
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    rows = q.all()

    series = []
    for ms, ar, m in rows:
        series.append(
            {
                "audit_id": ar.audit_id,
                "executed_at": ar.executed_at.isoformat() if ar.executed_at else None,
                "model_id": m.model_id,
                "model_name": m.name,
                "score_100": float(ms.severity_score_100 or 0.0),
                "band": str(ms.severity_band or "LOW"),
                "L": float(ms.likelihood or 0.0),
                "I": float(ms.impact or 0.0),
                "R": float(ms.regulatory_weight or 0.0),
                "frameworks": ms.framework_breakdown or {},
                "signals": ms.signals or {},
            }
        )

    return series


def _latest_metric(db: Session, metric_name: str, model_id: str | None):
    series = _fetch_metric_series(db, metric_name, model_id)
    return series[0] if series else None


def _metric_payload_new_scoring(db: Session, metric_name: str, model_id: str | None):
    latest = _latest_metric(db, metric_name, model_id)
    series = _fetch_metric_series(db, metric_name, model_id)

    if not latest:
        return {
            "metric": metric_name,
            "status": "NO_DATA",
            "latest": None,
            "trend": [],
        }

    return {
        "metric": metric_name,
        "status": "OK",
        "latest": latest,
        "trend": list(reversed(series)),  # oldest -> newest
    }


# =========================================================
# Option B: old fields + new scoring fields
# =========================================================

def _legacy_counts_payload(db: Session, category: str, model_id: str | None):
    """
    Returns fields expected by your existing UI:
    - totalModelsAnalyzed
    - modelsWithBias / modelsAtRisk etc
    - totalBiasIssues / totalViolations etc
    - distribution arrays
    """
    q = (
        db.query(AuditFinding)
        .join(AuditRun, AuditFinding.audit_id == AuditRun.id)
        .join(AIModel, AuditRun.model_id == AIModel.id)
        .filter(AuditFinding.category == category)
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    findings = q.all()

    severity_counts = Counter((f.severity or "UNKNOWN").upper() for f in findings)

    total_models = db.query(AIModel).count()

    # models impacted by that category
    models_impacted = len({f.audit_run.model_id for f in findings if f.audit_run})

    legacy = {
        "totalModelsAnalyzed": total_models,
        "modelsWithBias": models_impacted if category == "bias" else None,
        "totalBiasIssues": len(findings) if category == "bias" else None,
        "biasDistribution": [
            {"label": sev, "value": int(severity_counts.get(sev, 0))}
            for sev in SEVERITY_ORDER
        ] if category == "bias" else None,
        "severityData": [
            {"label": sev, "value": int(severity_counts.get(sev, 0))}
            for sev in SEVERITY_ORDER
        ] if category == "bias" else None,
    }

    # Compliance UI fields
    if category == "compliance":
        critical = int(severity_counts.get("CRITICAL", 0))
        high = int(severity_counts.get("HIGH", 0))

        exposure = "LOW"
        if critical > 0:
            exposure = "HIGH"
        elif high > 2:
            exposure = "MEDIUM"

        coverage_score = max(0, 100 - (critical * 20 + high * 10))

        legacy = {
            "complianceCoverageScore": int(coverage_score),
            "regulatoryExposure": exposure,
            "modelsAtRisk": models_impacted,
            "totalViolations": len(findings),
            "violationsBySeverity": [
                {"severity": sev, "count": int(severity_counts.get(sev, 0))}
                for sev in SEVERITY_ORDER
            ],
        }

    # PII UI fields
    if category == "pii":
        legacy = {
            "totalLeaks": len(findings),
            "criticalLeaks": int(severity_counts.get("CRITICAL", 0)),
            "bySeverity": {sev: int(severity_counts.get(sev, 0)) for sev in SEVERITY_ORDER},
        }

    # Hallucination UI fields
    if category == "hallucination":
        legacy = {
            "total": len(findings),
            "by_severity": {sev: int(severity_counts.get(sev, 0)) for sev in SEVERITY_ORDER},
        }

    # Drift UI placeholder (still no drift detector)
    if category == "drift":
        legacy = {"status": "NOT_IMPLEMENTED", "score": None}

    return legacy


# =========================================================
# Bias (OLD + NEW)
# =========================================================
@router.get("/bias")
def bias_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "bias", model_id)
    scoring = _metric_payload_new_scoring(db, "bias", model_id)

    return {
        **legacy,
        "scoring": scoring,
    }


# =========================================================
# PII (OLD + NEW)
# =========================================================
@router.get("/pii")
def pii_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "pii", model_id)
    scoring = _metric_payload_new_scoring(db, "pii", model_id)

    return {
        **legacy,
        "scoring": scoring,
    }


# =========================================================
# Hallucination (OLD + NEW)
# =========================================================
@router.get("/hallucination")
def hallucination_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "hallucination", model_id)
    scoring = _metric_payload_new_scoring(db, "hallucination", model_id)

    return {
        **legacy,
        "scoring": scoring,
    }


# =========================================================
# Compliance (OLD + NEW)
# =========================================================
@router.get("/compliance")
def compliance_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "compliance", model_id)
    scoring = _metric_payload_new_scoring(db, "compliance", model_id)

    return {
        **legacy,
        "scoring": scoring,
    }


# =========================================================
# Drift (OLD + NEW)
# =========================================================
@router.get("/drift")
def drift_metrics(model_id: str | None = Query(None), db: Session = Depends(get_db)):
    legacy = _legacy_counts_payload(db, "drift", model_id)
    scoring = _metric_payload_new_scoring(db, "drift", model_id)

    return {
        **legacy,
        "scoring": scoring,
    }
