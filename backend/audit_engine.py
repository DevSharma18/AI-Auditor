from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import desc

from .models import (
    AIModel,
    AuditRun,
    AuditFinding,
    AuditInteraction,
    AuditMetricScore,
    AuditSummary,
    EvidenceSource,
)

from .model_executor import ModelExecutor
from .audit_prompts import PROMPT_CATEGORIES

# Metrics
from .metrics.bias import BiasMetric
from .metrics.pii import PIIMetric
from .metrics.hallucination import HallucinationMetric
from .metrics.compliance import ComplianceMetric
from .metrics.drift import DriftMetric

# Scoring
from .scoring.normalization import IMPACT_BASELINES, clamp01
from .scoring.metrics import MetricScore, normalize_likelihood
from .scoring.regulatory_engine import compute_regulatory_weight
from .scoring.severity_engine import (
    score_metric_severity,
    score_global_severity,
    severity_band_from_score_100,
)

import logging

logger = logging.getLogger("ai-auditor")

CATEGORY_MAP = {
    "bias": "bias",
    "hallucination": "hallucination",
    "pii": "pii",
    "compliance": "compliance",
    "drift": "drift",
}

METRIC_FAMILIES = ["bias", "pii", "hallucination", "compliance", "drift"]


# =========================================================
# HELPERS
# =========================================================

def _norm(name: str) -> str:
    return (name or "").strip().lower()


def _metric_family(category: str, metric_name: str) -> str:
    c = _norm(category)
    m = _norm(metric_name)

    if m in METRIC_FAMILIES:
        return m

    for fam in METRIC_FAMILIES:
        if m.startswith(fam + "_"):
            return fam

    if c in METRIC_FAMILIES:
        return c

    return "compliance"


def _compute_likelihood(
    findings: List[Dict[str, Any]],
    interactions_count: int,
) -> Dict[str, Dict[str, Any]]:
    per_metric_count: Dict[str, int] = {}

    for f in findings:
        fam = _metric_family(f.get("category", ""), f.get("metric_name", ""))
        per_metric_count[fam] = per_metric_count.get(fam, 0) + 1

    denom = max(1, interactions_count)
    out: Dict[str, Dict[str, Any]] = {}

    for metric, cnt in per_metric_count.items():
        freq_ratio = min(float(cnt / denom), 1.0)
        L = float(normalize_likelihood(freq_ratio))
        out[metric] = {
            "L": L,
            "signals": {
                "finding_count": cnt,
                "interactions": interactions_count,
                "frequency_ratio": round(freq_ratio, 4),
            },
        }

    for fam in METRIC_FAMILIES:
        if fam not in out:
            out[fam] = {
                "L": 0.0,
                "signals": {
                    "finding_count": 0,
                    "interactions": interactions_count,
                    "frequency_ratio": 0.0,
                },
            }

    return out


# =========================================================
# AUDIT ENGINE
# =========================================================

class AuditEngine:
    def __init__(self, db: Session):
        self.db = db
        self.metric_registry = {
            "hallucination": HallucinationMetric(),
            "bias": BiasMetric(),
            "pii": PIIMetric(),
            "compliance": ComplianceMetric(),
            "drift": DriftMetric(),
        }

    def run_active_audit(
        self,
        model: AIModel,
        policy=None,
        audit_public_id: Optional[str] = None,
    ) -> AuditRun:

        # -------------------------------------------------
        # Evidence Source
        # -------------------------------------------------
        evidence = (
            self.db.query(EvidenceSource)
            .filter(EvidenceSource.model_id == model.id)
            .first()
        )
        if not evidence:
            raise RuntimeError("No EvidenceSource configured for this model")

        executor = ModelExecutor(evidence.config)

        # -------------------------------------------------
        # Load or create audit run
        # -------------------------------------------------
        if audit_public_id:
            audit = (
                self.db.query(AuditRun)
                .filter(AuditRun.audit_id == audit_public_id)
                .first()
            )
            if not audit:
                raise RuntimeError("AuditRun not found")
            audit.execution_status = "RUNNING"
            audit.audit_result = "RUNNING"
        else:
            audit_public_id = f"active_{uuid.uuid4().hex[:12]}"
            audit = AuditRun(
                audit_id=audit_public_id,
                model_id=model.id,
                audit_type="active",
                executed_at=datetime.utcnow(),
                execution_status="RUNNING",
                audit_result="RUNNING",
            )
            self.db.add(audit)
            self.db.commit()
            self.db.refresh(audit)

        interactions_buffer: List[Dict[str, Any]] = []
        findings_buffer: List[Dict[str, Any]] = []

        # -------------------------------------------------
        # Run prompts
        # -------------------------------------------------
        for category, prompts in PROMPT_CATEGORIES.items():
            metric = self.metric_registry.get(category)
            if not isinstance(prompts, list):
                continue

            for p in prompts:
                prompt_id = str(p.get("id") or uuid.uuid4().hex[:8])
                prompt_text = str(p.get("prompt") or "").strip()
                if not prompt_text:
                    continue

                execution = executor.execute_active_prompt(prompt_text)
                response_text = str(execution.get("content") or "")
                latency = float(execution.get("latency") or 0.0)

                interactions_buffer.append(
                    {
                        "prompt_id": prompt_id,
                        "prompt": prompt_text,
                        "response": response_text,
                        "latency_ms": latency * 1000,
                    }
                )

                if not metric:
                    continue

                results = metric.evaluate(prompt_text, response_text) or []

                for r in results:
                    fam = _metric_family(category, r.metric)

                    findings_buffer.append(
                        {
                            "category": fam,
                            "severity": r.severity,
                            "metric_name": r.metric,
                            "description": r.explanation,
                            "prompt_id": prompt_id,
                            # ✅ SOURCE OF TRUTH: metric emits enrichment
                            "extra": getattr(r, "extra", None),
                        }
                    )

        # -------------------------------------------------
        # Persist interactions
        # -------------------------------------------------
        prompt_to_interaction: Dict[str, int] = {}

        for i in interactions_buffer:
            row = AuditInteraction(
                audit_id=audit.id,
                prompt_id=i["prompt_id"],
                prompt=i["prompt"],
                response=i["response"],
                latency=i["latency_ms"],
            )
            self.db.add(row)
            self.db.flush()
            prompt_to_interaction[i["prompt_id"]] = row.id

        # -------------------------------------------------
        # Persist findings
        # -------------------------------------------------
        for f in findings_buffer:
            self.db.add(
                AuditFinding(
                    finding_id=f"finding_{uuid.uuid4().hex[:8]}",
                    audit_id=audit.id,
                    prompt_id=f["prompt_id"],
                    interaction_id=prompt_to_interaction.get(f["prompt_id"]),
                    category=f["category"],
                    severity=f["severity"],
                    metric_name=f["metric_name"],
                    description=f["description"],
                    extra=f.get("extra"),
                )
            )

        self.db.flush()

        # -------------------------------------------------
        # Metric scoring
        # -------------------------------------------------
        likelihoods = _compute_likelihood(findings_buffer, len(interactions_buffer))
        metric_scores: List[MetricScore] = []

        for fam in METRIC_FAMILIES:
            L = likelihoods[fam]["L"]
            I = IMPACT_BASELINES.get(fam, 0.5)
            R, breakdown = compute_regulatory_weight(fam)

            S, score_100 = score_metric_severity(L=L, I=I, R=R)
            band = severity_band_from_score_100(score_100)

            metric_scores.append(
                MetricScore(
                    metric=fam,
                    L=clamp01(L),
                    I=clamp01(I),
                    R=clamp01(R),
                    S=S,
                    score_100=score_100,
                    band=band,
                    frameworks=breakdown,
                    signals=likelihoods[fam]["signals"],
                )
            )

            self.db.add(
                AuditMetricScore(
                    audit_id=audit.id,
                    metric_name=fam,
                    likelihood=L,
                    impact=I,
                    regulatory_weight=R,
                    severity_score=S,
                    severity_score_100=score_100,
                    severity_band=band,
                    framework_breakdown=breakdown,
                    signals=likelihoods[fam]["signals"],
                )
            )

        # -------------------------------------------------
        # Drift baseline & delta (LIVE)
        # -------------------------------------------------
        prev_drift = (
            self.db.query(AuditMetricScore)
            .join(AuditRun, AuditMetricScore.audit_id == AuditRun.id)
            .filter(
                AuditMetricScore.metric_name == "drift",
                AuditRun.model_id == model.id,
                AuditRun.id != audit.id,
            )
            .order_by(desc(AuditRun.executed_at))
            .first()
        )

        current_drift = next((m for m in metric_scores if m.metric == "drift"), None)

        drift_baseline = prev_drift.severity_score_100 if prev_drift else None
        drift_delta = (
            current_drift.score_100 - drift_baseline
            if (current_drift and drift_baseline is not None)
            else 0.0
        )

        # -------------------------------------------------
        # Summary
        # -------------------------------------------------
        _, global_score, global_band = score_global_severity(metric_scores)

        self.db.add(
            AuditSummary(
                audit_id=audit.id,
                risk_score=global_score,
                total_findings=len(findings_buffer),
                critical_findings=sum(1 for f in findings_buffer if f["severity"] == "CRITICAL"),
                high_findings=sum(1 for f in findings_buffer if f["severity"] == "HIGH"),
                metrics_snapshot={
                    "drift": {
                        "baseline": drift_baseline,
                        "current": current_drift.score_100 if current_drift else None,
                        "delta": drift_delta,
                    }
                },
            )
        )

        audit.execution_status = "SUCCESS"
        audit.audit_result = (
            "AUDIT_FAIL"
            if any(f["severity"] == "CRITICAL" for f in findings_buffer)
            else "AUDIT_WARN"
            if any(f["severity"] == "HIGH" for f in findings_buffer)
            else "AUDIT_PASS"
        )

        self.db.commit()
        self.db.refresh(audit)
        return audit
