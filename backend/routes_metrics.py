# backend/routes_metrics.py

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from .database import get_db
from .models import (
    AIModel,
    AuditRun,
    AuditFinding,
    AuditMetricScore,
)

router = APIRouter(tags=["Metrics"])


# =========================================================
# INTERNAL HELPERS
# =========================================================

def _safe_float(v: Any, default: float = 0.0) -> float:
    try:
        if v is None:
            return default
        return float(v)
    except Exception:
        return default


def _safe_int(v: Any, default: int = 0) -> int:
    try:
        if v is None:
            return default
        return int(v)
    except Exception:
        return default


def _band_from_score100(score100: float) -> str:
    s = max(0.0, min(100.0, _safe_float(score100, 0.0)))

    # Enterprise bands (same style your UI expects)
    if s >= 90:
        return "CRITICAL"
    if s >= 75:
        return "SEVERE"
    if s >= 60:
        return "HIGH"
    if s >= 40:
        return "MODERATE"
    return "LOW"


def _serialize_metric_row(
    db: Session,
    row: AuditMetricScore,
) -> Dict[str, Any]:
    """
    Normalizes DB metric score → frontend compatible payload
    """
    audit: Optional[AuditRun] = db.query(AuditRun).filter(AuditRun.id == row.audit_id).first()
    model: Optional[AIModel] = None
    if audit:
        model = db.query(AIModel).filter(AIModel.id == audit.model_id).first()

    return {
        "audit_id": audit.audit_id if audit else None,
        "executed_at": audit.executed_at.isoformat() if (audit and audit.executed_at) else None,
        "model_id": model.model_id if model else None,
        "model_name": model.name if model else None,
        "score_100": _safe_float(row.severity_score_100, 0.0),
        "band": str(row.severity_band or _band_from_score100(row.severity_score_100)).upper(),
        # IMPORTANT: frontend expects L/I/R in 0..1 (you already do this)
        "L": _safe_float(row.likelihood, 0.0),
        "I": _safe_float(row.impact, 0.0),
        "R": _safe_float(row.regulatory_weight, 0.0),
        # Frameworks + signals
        "frameworks": row.framework_breakdown or {},
        "signals": row.signals or {},
        "alpha": _safe_float(row.alpha, 1.0),
        "beta": _safe_float(row.beta, 1.5),
    }


def _get_metric_query(
    db: Session,
    metric_name: str,
    model_id: Optional[str],
):
    """
    Builds the base query for AuditMetricScore joined to AuditRun + AIModel
    """
    q = (
        db.query(AuditMetricScore)
        .join(AuditRun, AuditMetricScore.audit_id == AuditRun.id)
        .join(AIModel, AuditRun.model_id == AIModel.id)
        .filter(AuditMetricScore.metric_name == metric_name)
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    return q


def _latest_and_trend(
    db: Session,
    metric_name: str,
    model_id: Optional[str],
    limit: int = 50,
) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Returns:
    - latest metric scoring point
    - trend list (oldest→newest)
    """
    q = _get_metric_query(db, metric_name=metric_name, model_id=model_id)

    # Order by executed_at DESC
    rows: List[AuditMetricScore] = (
        q.order_by(desc(AuditRun.executed_at))
        .limit(limit)
        .all()
    )

    if not rows:
        return None, []

    # trend oldest→newest for charts
    rows_sorted = list(reversed(rows))
    trend = [_serialize_metric_row(db, r) for r in rows_sorted]

    latest = _serialize_metric_row(db, rows[0])
    return latest, trend


def _build_scoring_response(
    db: Session,
    metric_name: str,
    model_id: Optional[str],
) -> Dict[str, Any]:
    latest, trend = _latest_and_trend(db, metric_name=metric_name, model_id=model_id, limit=50)

    if not latest:
        return {
            "scoring": {
                "metric": metric_name,
                "status": "NO_DATA",
                "latest": None,
                "trend": [],
            }
        }

    return {
        "scoring": {
            "metric": metric_name,
            "status": "OK",
            "latest": latest,
            "trend": trend,
        }
    }


# =========================================================
# DASHBOARD OVERVIEW (LIVE)
# =========================================================

@router.get("/dashboard/overview")
def dashboard_overview(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    LIVE backend overview used by dashboard/page.tsx

    Returns:
    - total models
    - total audits
    - overall risk score (avg of latest compliance/bias/pii/drift/hallucination)
    - failed audits
    - total findings
    - severity breakdown
    """

    total_models = db.query(func.count(AIModel.id)).scalar() or 0
    total_audits = db.query(func.count(AuditRun.id)).scalar() or 0

    # Findings counts
    total_findings = db.query(func.count(AuditFinding.id)).scalar() or 0

    critical_findings = (
        db.query(func.count(AuditFinding.id))
        .filter(func.upper(AuditFinding.severity) == "CRITICAL")
        .scalar()
        or 0
    )
    high_findings = (
        db.query(func.count(AuditFinding.id))
        .filter(func.upper(AuditFinding.severity) == "HIGH")
        .scalar()
        or 0
    )
    medium_findings = (
        db.query(func.count(AuditFinding.id))
        .filter(func.upper(AuditFinding.severity) == "MEDIUM")
        .scalar()
        or 0
    )
    low_findings = (
        db.query(func.count(AuditFinding.id))
        .filter(func.upper(AuditFinding.severity) == "LOW")
        .scalar()
        or 0
    )

    # Failed audits
    failed_audits = (
        db.query(func.count(AuditRun.id))
        .filter(func.upper(AuditRun.audit_result).in_(["AUDIT_FAIL", "FAILED"]))
        .scalar()
        or 0
    )

    # Overall AI Risk Score = average of latest metric scores across main families
    # (enterprise-safe: if missing some metrics, average only those available)
    metric_names = ["bias", "pii", "hallucination", "drift", "compliance"]

    latest_scores: List[float] = []

    for m in metric_names:
        row = (
            db.query(AuditMetricScore)
            .join(AuditRun, AuditMetricScore.audit_id == AuditRun.id)
            .filter(AuditMetricScore.metric_name == m)
            .order_by(desc(AuditRun.executed_at))
            .first()
        )
        if row:
            latest_scores.append(_safe_float(row.severity_score_100, 0.0))

    overall_risk_score = 0.0
    if latest_scores:
        overall_risk_score = sum(latest_scores) / max(1, len(latest_scores))

    return {
        "status": "OK",
        "metrics": {
            "total_models": int(total_models),
            "total_audits": int(total_audits),
            "overall_risk_score": float(round(overall_risk_score, 2)),
            "failed_audits": int(failed_audits),
            "total_findings": int(total_findings),
            "critical_findings_count": int(critical_findings),
            "high_findings_count": int(high_findings),
            "medium_findings_count": int(medium_findings),
            "low_findings_count": int(low_findings),
        },
    }


# =========================================================
# CORE METRICS (LIVE)
# =========================================================

@router.get("/metrics/bias")
def metrics_bias(
    model_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return _build_scoring_response(db, metric_name="bias", model_id=model_id)


@router.get("/metrics/pii")
def metrics_pii(
    model_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return _build_scoring_response(db, metric_name="pii", model_id=model_id)


@router.get("/metrics/hallucination")
def metrics_hallucination(
    model_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return _build_scoring_response(db, metric_name="hallucination", model_id=model_id)


@router.get("/metrics/drift")
def metrics_drift(
    model_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return _build_scoring_response(db, metric_name="drift", model_id=model_id)


@router.get("/metrics/compliance")
def metrics_compliance(
    model_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return _build_scoring_response(db, metric_name="compliance", model_id=model_id)


# =========================================================
# ✅ PII CATEGORIES (LIVE)
# Used by frontend PII page to replace "Coming Soon"
# =========================================================

@router.get("/metrics/pii/categories")
def pii_categories(
    model_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    LIVE PII Category breakdown

    Requires:
    - AuditFinding.metric_name == "pii"
    - AuditFinding.extra includes "pii_type" OR "pii_category"

    Example finding.extra:
    {
      "pii_type": "EMAIL",
      "source": "response"
    }
    """

    q = (
        db.query(AuditFinding)
        .join(AuditRun, AuditFinding.audit_id == AuditRun.id)
        .join(AIModel, AuditRun.model_id == AIModel.id)
        .filter(AuditFinding.metric_name == "pii")
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    findings: List[AuditFinding] = q.order_by(desc(AuditRun.executed_at)).limit(500).all()

    counts: Dict[str, int] = defaultdict(int)

    for f in findings:
        extra = f.extra or {}
        pii_type = (
            extra.get("pii_type")
            or extra.get("pii_category")
            or extra.get("type")
            or "UNKNOWN"
        )
        pii_type = str(pii_type).strip().upper()
        counts[pii_type] += 1

    # If there is no enriched data yet, still return 0 breakdown (UI stays live)
    out = [{"name": k.title(), "value": v} for k, v in sorted(counts.items(), key=lambda x: x[1], reverse=True)]

    return {
        "status": "OK",
        "model_id": model_id,
        "categories": out,
        "total_findings": sum(counts.values()),
        "note": "PII categories derived from AuditFinding.extra (pii_type/pii_category).",
    }


# =========================================================
# ✅ COMPLIANCE COVERAGE BY REGULATION (LIVE)
# Used by frontend Compliance page table
# =========================================================

@router.get("/metrics/compliance/regulations")
def compliance_regulations(
    model_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    LIVE coverage mapping:

    Reads from:
    - AuditFinding.metric_name == "compliance"
    - AuditFinding.extra["regulation_scores"] = { GDPR: 70, EUAI: 65, OWASP_AI: 60 ... }

    If no regulation_scores exists, coverage will show 0.
    """

    q = (
        db.query(AuditFinding)
        .join(AuditRun, AuditFinding.audit_id == AuditRun.id)
        .join(AIModel, AuditRun.model_id == AIModel.id)
        .filter(AuditFinding.metric_name == "compliance")
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    findings: List[AuditFinding] = q.order_by(desc(AuditRun.executed_at)).limit(800).all()

    scores_acc: Dict[str, List[float]] = defaultdict(list)

    for f in findings:
        extra = f.extra or {}
        reg_scores = extra.get("regulation_scores") or {}
        if isinstance(reg_scores, dict):
            for k, v in reg_scores.items():
                scores_acc[str(k).upper()].append(_safe_float(v, 0.0))

    # Compute avg score per regulation
    regulation_rows = []
    for reg, arr in scores_acc.items():
        if not arr:
            continue
        avg_score = sum(arr) / max(1, len(arr))
        # Coverage = avg_score (0..100) directly (since your metric already emits %)
        regulation_rows.append(
            {
                "regulation": reg,
                "coverage": int(round(avg_score)),
            }
        )

    # Always return stable list even if none exist
    regulation_rows.sort(key=lambda x: x["coverage"], reverse=True)

    return {
        "status": "OK",
        "model_id": model_id,
        "coverage": regulation_rows,
        "total_signals": sum(len(v) for v in scores_acc.values()),
        "note": "Coverage computed from AuditFinding.extra.regulation_scores emitted by ComplianceMetric.",
    }


# =========================================================
# ✅ BIAS PATTERN DRIFT (LIVE)
# Used by Drift page "Recurring Bias Patterns"
# =========================================================

@router.get("/metrics/bias/patterns")
def bias_patterns(
    model_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    LIVE recurring bias patterns.

    Reads from:
    - AuditFinding.metric_name == "bias"
    - Uses AuditFinding.metric_name + AuditFinding.category + AuditFinding.rule_id + description
    """

    q = (
        db.query(AuditFinding)
        .join(AuditRun, AuditFinding.audit_id == AuditRun.id)
        .join(AIModel, AuditRun.model_id == AIModel.id)
        .filter(AuditFinding.metric_name == "bias")
    )

    if model_id:
        q = q.filter(AIModel.model_id == model_id)

    findings: List[AuditFinding] = q.order_by(desc(AuditRun.executed_at)).limit(800).all()

    buckets: Dict[str, int] = defaultdict(int)
    affected_models: Dict[str, set] = defaultdict(set)

    for f in findings:
        label = f.category or "Bias Finding"
        label = str(label).strip()

        buckets[label] += 1

        # track how many distinct models were impacted (global mode)
        if not model_id:
            # find model_id by joining via audit run
            audit = db.query(AuditRun).filter(AuditRun.id == f.audit_id).first()
            if audit:
                mdl = db.query(AIModel).filter(AIModel.id == audit.model_id).first()
                if mdl:
                    affected_models[label].add(mdl.model_id)

    # Convert to enterprise rows
    rows = []
    for k, v in sorted(buckets.items(), key=lambda x: x[1], reverse=True):
        rows.append(
            {
                "type": k,
                "count": int(v),
                "impact": "Measured from audit findings",
                "affectedModels": int(len(affected_models.get(k, set()))),
            }
        )

    return {
        "status": "OK",
        "model_id": model_id,
        "patterns": rows,
        "total_findings": sum(buckets.values()),
        "note": "Bias patterns derived from AuditFinding.category for metric=bias.",
    }
