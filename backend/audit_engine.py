# backend/audit_engine.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

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

# ✅ Metrics (prompt-agnostic)
from .metrics.bias import BiasMetric
from .metrics.pii import PIIMetric
from .metrics.hallucination import HallucinationMetric
from .metrics.compliance import ComplianceMetric
from .metrics.drift import DriftMetric

# ✅ Enterprise scoring
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
    "bias_score": "bias",
    "hallucination": "hallucination",
    "hallucination_score": "hallucination",
    "pii": "pii",
    "pii_score": "pii",
    "system": "compliance",
    "compliance": "compliance",
    "drift": "drift",
}

METRIC_FAMILIES = ["bias", "pii", "hallucination", "compliance", "drift"]


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

    denom = max(1, int(interactions_count))

    out: Dict[str, Dict[str, Any]] = {}
    for metric, cnt in per_metric_count.items():
        freq_ratio = float(cnt / denom)
        freq_ratio = float(min(freq_ratio, 1.0))

        L = float(normalize_likelihood(freq_ratio))

        out[metric] = {
            "L": L,
            "signals": {
                "finding_count": int(cnt),
                "interactions": int(interactions_count),
                "frequency_ratio": round(freq_ratio, 4),
            },
        }

    for fam in METRIC_FAMILIES:
        if fam not in out:
            out[fam] = {
                "L": 0.0,
                "signals": {
                    "finding_count": 0,
                    "interactions": int(interactions_count),
                    "frequency_ratio": 0.0,
                },
            }

    return out


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
        """
        ✅ Enterprise Active Audit Engine

        FIXED BEHAVIOR:
        - If audit_public_id provided:
            - reuse the SAME AuditRun row created by routes.py
            - attach interactions/findings/metrics/summary to it
        - If audit_public_id not provided:
            - create a new AuditRun row (fallback)

        Always commits results into DB.
        """

        # ---------------------------------------------------------
        # EvidenceSource
        # ---------------------------------------------------------
        evidence = (
            self.db.query(EvidenceSource)
            .filter(
                EvidenceSource.model_id == model.id,
                EvidenceSource.source_type == "api",
            )
            .first()
        )
        if not evidence:
            raise RuntimeError("No EvidenceSource configured for this model")

        executor = ModelExecutor(evidence.config)

        # ---------------------------------------------------------
        # Load or create audit row
        # ---------------------------------------------------------
        audit: Optional[AuditRun] = None

        if audit_public_id:
            audit = self.db.query(AuditRun).filter(AuditRun.audit_id == audit_public_id).first()
            if not audit:
                raise RuntimeError(f"AuditRun not found for audit_id={audit_public_id}")

            # make sure it is marked running at start
            audit.execution_status = "RUNNING"
            audit.audit_result = "RUNNING"
            audit.executed_at = audit.executed_at or datetime.utcnow()
            self.db.commit()

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

        # ---------------------------------------------------------
        # Run prompts
        # ---------------------------------------------------------
        interactions_buffer: List[Dict[str, Any]] = []
        findings_buffer: List[Dict[str, Any]] = []

        prompts_executed = 0
        total_latency_seconds = 0.0

        total_prompts = sum(
            len(v) for v in PROMPT_CATEGORIES.values() if isinstance(v, list)
        )

        logger.info(f"Active audit START model={model.model_id} prompts={total_prompts} audit_id={audit.audit_id}")

        executed_counter = 0

        for category, prompts in PROMPT_CATEGORIES.items():
            metric = self.metric_registry.get(category)

            if not isinstance(prompts, list):
                continue

            for p in prompts:
                executed_counter += 1

                if executed_counter % 25 == 0:
                    logger.info(
                        f"Active audit progress model={model.model_id} audit_id={audit.audit_id} executed={executed_counter}/{total_prompts}"
                    )

                prompt_id = str(p.get("id") or f"{category}_{uuid.uuid4().hex[:6]}")
                prompt_text = str(p.get("prompt") or "")

                if not prompt_text.strip():
                    continue

                try:
                    execution = executor.execute_active_prompt(prompt_text)
                    response_text = execution.get("content", "")
                    latency_seconds = float(execution.get("latency", 0.0))

                except Exception as exc:
                    findings_buffer.append(
                        {
                            "category": "compliance",
                            "severity": "HIGH",
                            "metric_name": "execution_failure",
                            "description": str(exc),
                            "prompt_id": prompt_id,
                        }
                    )
                    logger.warning(
                        f"Prompt execution failed model={model.model_id} prompt_id={prompt_id} category={category} err={exc}"
                    )
                    continue

                prompts_executed += 1
                total_latency_seconds += latency_seconds

                interactions_buffer.append(
                    {
                        "prompt_id": prompt_id,
                        "prompt": prompt_text,
                        "response": response_text if isinstance(response_text, str) else str(response_text),
                        "latency_ms": round(latency_seconds * 1000, 2),
                    }
                )

                if metric:
                    result = metric.evaluate(prompt=prompt_text, response=str(response_text or ""))

                    results_list: List[Any] = []
                    if result is None:
                        results_list = []
                    elif isinstance(result, list):
                        results_list = result
                    else:
                        results_list = [result]

                    for r in results_list:
                        fam = _metric_family(category, getattr(r, "metric", "") or category)

                        findings_buffer.append(
                            {
                                "category": CATEGORY_MAP.get(fam, fam),
                                "severity": str(getattr(r, "severity", "LOW") or "LOW").upper(),
                                "metric_name": str(getattr(r, "metric", fam)),
                                "description": str(getattr(r, "explanation", "") or ""),
                                "prompt_id": prompt_id,
                            }
                        )

        logger.info(
            f"Active audit END model={model.model_id} audit_id={audit.audit_id} prompts_ok={prompts_executed}/{total_prompts} interactions={len(interactions_buffer)} findings={len(findings_buffer)}"
        )

        # ---------------------------------------------------------
        # Determine result
        # ---------------------------------------------------------
        critical = sum(1 for f in findings_buffer if f.get("severity") == "CRITICAL")
        high = sum(1 for f in findings_buffer if f.get("severity") == "HIGH")

        audit_result = (
            "AUDIT_FAIL"
            if critical > 0
            else "AUDIT_WARN"
            if high > 0
            else "AUDIT_PASS"
        )

        avg_latency_seconds: Optional[float] = None
        if prompts_executed > 0:
            avg_latency_seconds = round(total_latency_seconds / prompts_executed, 3)

        # ---------------------------------------------------------
        # Persist interactions & findings
        # ---------------------------------------------------------
        prompt_to_interaction_id: Dict[str, int] = {}

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
            prompt_to_interaction_id[i["prompt_id"]] = int(row.id)

        for f in findings_buffer:
            pid = str(f.get("prompt_id") or "")
            linked_interaction_id = prompt_to_interaction_id.get(pid)

            self.db.add(
                AuditFinding(
                    finding_id=f"finding_{uuid.uuid4().hex[:8]}",
                    audit_id=audit.id,
                    prompt_id=pid if pid else None,
                    interaction_id=linked_interaction_id,
                    category=str(f.get("category") or "compliance"),
                    severity=str(f.get("severity") or "LOW"),
                    metric_name=str(f.get("metric_name") or "unknown"),
                    description=str(f.get("description") or ""),
                )
            )

        self.db.flush()

        # ---------------------------------------------------------
        # Metric scoring
        # ---------------------------------------------------------
        likelihood_map = _compute_likelihood(
            findings=findings_buffer,
            interactions_count=len(interactions_buffer),
        )

        metric_scores: List[MetricScore] = []

        for metric_name in METRIC_FAMILIES:
            L = float(likelihood_map.get(metric_name, {}).get("L", 0.0))
            I = float(IMPACT_BASELINES.get(metric_name, 0.5))

            R, breakdown = compute_regulatory_weight(metric_name)
            R = float(R)

            S, score_100 = score_metric_severity(L=L, I=I, R=R)
            band = severity_band_from_score_100(score_100)

            ms = MetricScore(
                metric=metric_name,  # type: ignore
                L=clamp01(L),
                I=clamp01(I),
                R=clamp01(R),
                alpha=1.0,
                beta=1.5,
                w=1.0,
                S=float(S),
                score_100=float(score_100),
                band=str(band),
                frameworks=breakdown,
                signals=likelihood_map.get(metric_name, {}).get("signals", {}),
            )
            metric_scores.append(ms)

            self.db.add(
                AuditMetricScore(
                    audit_id=audit.id,
                    metric_name=metric_name,
                    likelihood=float(ms.L),
                    impact=float(ms.I),
                    regulatory_weight=float(ms.R),
                    alpha=float(ms.alpha),
                    beta=float(ms.beta),
                    severity_score=float(ms.S),
                    severity_score_100=float(ms.score_100),
                    severity_band=str(ms.band),
                    strategic_weight=float(ms.w),
                    framework_breakdown=ms.frameworks or {},
                    signals=ms.signals or {},
                )
            )

        self.db.flush()

        # ---------------------------------------------------------
        # Global severity summary
        # ---------------------------------------------------------
        _, global_score_100, global_band = score_global_severity(metric_scores)

        self.db.add(
            AuditSummary(
                audit_id=audit.id,
                drift_score=None,
                bias_score=None,
                risk_score=float(global_score_100),
                total_findings=len(findings_buffer),
                critical_findings=critical,
                high_findings=high,
                metrics_snapshot={
                    "prompts_executed": prompts_executed,
                    "avg_latency_seconds": avg_latency_seconds,
                    "dynamic_scoring": {
                        "global_score_100": global_score_100,
                        "global_band": global_band,
                        "per_metric": [
                            {
                                "metric": ms.metric,
                                "L": ms.L,
                                "I": ms.I,
                                "R": ms.R,
                                "S": ms.S,
                                "score_100": ms.score_100,
                                "band": ms.band,
                                "w": ms.w,
                                "frameworks": ms.frameworks or {},
                                "signals": ms.signals or {},
                            }
                            for ms in metric_scores
                        ],
                    },
                },
            )
        )

        # ---------------------------------------------------------
        # Final audit status in same row
        # ---------------------------------------------------------
        audit.execution_status = "SUCCESS"
        audit.audit_result = audit_result

        self.db.commit()
        self.db.refresh(audit)
        return audit
