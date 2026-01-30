from __future__ import annotations

import uuid
import threading
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

from .metrics.bias import BiasMetric
from .metrics.pii import PIIMetric
from .metrics.hallucination import HallucinationMetric
from .metrics.compliance import ComplianceMetric
from .metrics.drift import DriftMetric

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
    detailed_counts: Dict[str, Dict[str, int]] = {}

    for f in findings:
        fam = _metric_family(f.get("category", ""), f.get("metric_name", ""))
        per_metric_count[fam] = per_metric_count.get(fam, 0) + 1
        
        if fam not in detailed_counts:
            detailed_counts[fam] = {}
        m_name = f.get("metric_name", "unknown")
        detailed_counts[fam][m_name] = detailed_counts[fam].get(m_name, 0) + 1

    denom = max(1, int(interactions_count))

    out: Dict[str, Dict[str, Any]] = {}
    for metric, cnt in per_metric_count.items():
        freq_ratio = float(cnt / denom)
        freq_ratio = float(min(freq_ratio, 1.0))

        L = float(normalize_likelihood(freq_ratio))

        signals_data = {
            "finding_count": int(cnt),
            "interactions": int(interactions_count),
            "frequency_ratio": round(freq_ratio, 4),
        }
        signals_data.update(detailed_counts.get(metric, {}))

        out[metric] = {
            "L": L,
            "signals": signals_data,
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
        cancel_event: threading.Event = None
    ) -> AuditRun:

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
        audit: Optional[AuditRun] = None

        if audit_public_id:
            audit = self.db.query(AuditRun).filter(AuditRun.audit_id == audit_public_id).first()
            if not audit:
                raise RuntimeError(f"AuditRun not found for audit_id={audit_public_id}")

            # Safety check: if already cancelled, don't restart
            if audit.execution_status == "CANCELLED":
                return audit

            audit.execution_status = "RUNNING"
            audit.audit_result = "RUNNING"
            audit.executed_at = audit.executed_at or datetime.utcnow()
            self.db.commit()

        # ---------------------------------------------------------
        # Execution Loop
        # ---------------------------------------------------------
        interactions_buffer: List[Dict[str, Any]] = []
        findings_buffer: List[Dict[str, Any]] = []
        reg_score_accumulator: Dict[str, Dict[str, float]] = {fam: {} for fam in METRIC_FAMILIES}

        prompts_executed = 0
        total_latency_seconds = 0.0

        total_prompts = sum(len(v) for v in PROMPT_CATEGORIES.values() if isinstance(v, list))
        logger.info(f"Active audit START model={model.model_id} prompts={total_prompts} audit_id={audit.audit_id}")

        for category, prompts in PROMPT_CATEGORIES.items():
            metric = self.metric_registry.get(category)
            if not isinstance(prompts, list):
                continue

            for p in prompts:
                # 🛑 STOP CHECK
                if cancel_event and cancel_event.is_set():
                    logger.warning(f"Audit {audit.audit_id} CANCELLED during loop.")
                    audit.execution_status = "CANCELLED"
                    audit.audit_result = "CANCELLED"
                    self.db.commit()
                    return audit

                # Also check DB directly in case event was missed (double safety)
                self.db.refresh(audit)
                if audit.execution_status == "CANCELLED":
                    logger.warning(f"Audit {audit.audit_id} marked CANCELLED in DB. Stopping.")
                    return audit

                prompt_id = str(p.get("id") or f"{category}_{uuid.uuid4().hex[:6]}")
                prompt_text = str(p.get("prompt") or "")

                if not prompt_text.strip():
                    continue

                try:
                    execution = executor.execute_active_prompt(prompt_text)
                    response_text = execution.get("content", "")
                    latency_seconds = float(execution.get("latency", 0.0))

                except Exception as exc:
                    findings_buffer.append({
                        "category": "compliance",
                        "severity": "HIGH",
                        "metric_name": "execution_failure",
                        "description": str(exc),
                        "prompt_id": prompt_id,
                    })
                    continue

                prompts_executed += 1
                total_latency_seconds += latency_seconds

                interactions_buffer.append({
                    "prompt_id": prompt_id,
                    "prompt": prompt_text,
                    "response": str(response_text),
                    "latency_ms": round(latency_seconds * 1000, 2),
                })

                if metric:
                    result = metric.evaluate(prompt=prompt_text, response=str(response_text or ""))
                    results_list = result if isinstance(result, list) else [result] if result else []

                    for r in results_list:
                        fam = _metric_family(category, getattr(r, "metric", "") or category)
                        
                        if hasattr(r, "extra") and r.extra and "reg_scores" in r.extra:
                            for reg, score in r.extra["reg_scores"].items():
                                current_min = reg_score_accumulator[fam].get(reg, 1.0)
                                reg_score_accumulator[fam][reg] = min(current_min, float(score))

                        findings_buffer.append({
                            "category": CATEGORY_MAP.get(fam, fam),
                            "severity": str(getattr(r, "severity", "LOW") or "LOW").upper(),
                            "metric_name": str(getattr(r, "metric", fam)),
                            "description": str(getattr(r, "explanation", "") or ""),
                            "prompt_id": prompt_id,
                        })

        # ---------------------------------------------------------
        # Persist results
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
            self.db.add(AuditFinding(
                finding_id=f"finding_{uuid.uuid4().hex[:8]}",
                audit_id=audit.id,
                prompt_id=pid if pid else None,
                interaction_id=prompt_to_interaction_id.get(pid),
                category=str(f.get("category") or "compliance"),
                severity=str(f.get("severity") or "LOW"),
                metric_name=str(f.get("metric_name") or "unknown"),
                description=str(f.get("description") or ""),
            ))

        # ---------------------------------------------------------
        # Scoring
        # ---------------------------------------------------------
        likelihood_map = _compute_likelihood(findings_buffer, len(interactions_buffer))
        metric_scores: List[MetricScore] = []

        for metric_name in METRIC_FAMILIES:
            L = float(likelihood_map.get(metric_name, {}).get("L", 0.0))
            I = float(IMPACT_BASELINES.get(metric_name, 0.5))
            
            accumulated_regs = reg_score_accumulator.get(metric_name, {})
            finding_extra = {"reg_scores": accumulated_regs} if accumulated_regs else None
            
            R, breakdown = compute_regulatory_weight(metric_name, finding_extra=finding_extra)
            
            S, score_100 = score_metric_severity(L=L, I=I, R=float(R))
            band = severity_band_from_score_100(score_100)

            ms = MetricScore(
                metric=metric_name,
                L=clamp01(L), I=clamp01(I), R=clamp01(float(R)),
                alpha=1.0, beta=1.5, w=1.0, S=float(S),
                score_100=float(score_100), band=str(band),
                frameworks=breakdown,
                signals=likelihood_map.get(metric_name, {}).get("signals", {}),
            )
            metric_scores.append(ms)

            self.db.add(AuditMetricScore(
                audit_id=audit.id, metric_name=metric_name,
                likelihood=ms.L, impact=ms.I, regulatory_weight=ms.R,
                alpha=ms.alpha, beta=ms.beta, severity_score=ms.S,
                severity_score_100=ms.score_100, severity_band=ms.band,
                strategic_weight=ms.w, framework_breakdown=ms.frameworks,
                signals=ms.signals
            ))

        # ---------------------------------------------------------
        # Final Summary & Completion Check (Race Condition Fix)
        # ---------------------------------------------------------
        _, global_score_100, global_band = score_global_severity(metric_scores)
        
        self.db.add(AuditSummary(
            audit_id=audit.id, risk_score=float(global_score_100),
            total_findings=len(findings_buffer),
            critical_findings=sum(1 for f in findings_buffer if f["severity"] == "CRITICAL"),
            high_findings=sum(1 for f in findings_buffer if f["severity"] == "HIGH"),
            metrics_snapshot={"avg_latency_seconds": round(total_latency_seconds / max(1, prompts_executed), 3)}
        ))

        # 🛑 FINAL CHECK: Did user cancel while we were calculating scores?
        self.db.refresh(audit)
        if audit.execution_status == "CANCELLED":
            logger.warning(f"Audit {audit.audit_id} was cancelled externally. Not marking SUCCESS.")
            return audit

        audit.execution_status = "SUCCESS"
        audit.audit_result = "AUDIT_FAIL" if any(f["severity"] == "CRITICAL" for f in findings_buffer) else "AUDIT_PASS"
        self.db.commit()
        
        return audit