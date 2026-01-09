import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from .models import (
    AIModel,
    AuditRun,
    AuditSummary,
    AuditFinding,
    AuditPolicy,
    EvidenceSource,
    AuditInteraction,
)

from .model_executor import ModelExecutor
from .audit_prompts import PROMPT_CATEGORIES
from .audit_prompts.hallucination import HallucinationRule
from .metrics.hallucination import HallucinationMetric
from .metrics.bias import BiasMetric
from .metrics.pii import PIIMetric


# =========================
# CATEGORY NORMALIZATION
# =========================
CATEGORY_MAP = {
    "bias": "bias",
    "bias_score": "bias",
    "hallucination": "hallucination",
    "hallucination_score": "hallucination",
    "pii": "pii",
    "pii_score": "pii",
    "system": "compliance",
}


class AuditEngine:
    def __init__(self, db: Session):
        self.db = db

        self.rule_registry = {
            "hallucination": [HallucinationRule()],
        }

        self.metric_registry = {
            "hallucination": HallucinationMetric(),
            "bias": BiasMetric(),
            "pii": PIIMetric(),
        }

    # =========================================================
    # ACTIVE AUDIT
    # =========================================================
    def run_active_audit(
        self,
        model: AIModel,
        policy: AuditPolicy,
    ) -> AuditRun:

        audit_public_id = f"active_{uuid.uuid4().hex[:12]}"

        evidence = (
            self.db.query(EvidenceSource)
            .filter(
                EvidenceSource.model_id == model.id,
                EvidenceSource.source_type == "api",
            )
            .first()
        )

        if not evidence:
            return self._create_no_evidence_audit(
                model, audit_public_id, "No API connector configured"
            )

        executor = ModelExecutor(evidence.config)

        findings: List[Dict] = []
        interactions: List[AuditInteraction] = []

        prompts_executed = 0
        total_latency = 0.0

        for category, prompt_defs in PROMPT_CATEGORIES.items():

            rules = self.rule_registry.get(category, [])
            metric = self.metric_registry.get(category)

            for p in prompt_defs:
                try:
                    execution = executor.execute_active_prompt(p["prompt"])
                    response = execution["raw_response"]
                    latency = execution["latency"]

                    prompts_executed += 1
                    total_latency += latency

                except Exception as exc:
                    findings.append({
                        "category": "compliance",
                        "severity": "HIGH",
                        "metric_name": "execution_failure",
                        "description": str(exc),
                    })
                    continue

                interaction = AuditInteraction(
                    audit_id=None,
                    prompt_id=p["id"],
                    prompt=p["prompt"],
                    response=response,
                    latency=round(latency * 1000, 2),
                )

                self.db.add(interaction)
                interactions.append(interaction)

                # -------------------------
                # RULES
                # -------------------------
                for rule in rules:
                    result = rule.evaluate(
                        prompt_id=p["id"],
                        prompt=p["prompt"],
                        response=response,
                    )
                    if result:
                        findings.append({
                            "category": CATEGORY_MAP.get(result.category, result.category),
                            "severity": result.severity,
                            "metric_name": result.rule_id,
                            "description": result.description,
                        })

                # -------------------------
                # METRICS
                # -------------------------
                if metric:
                    metric_result = metric.evaluate(
                        prompt=p["prompt"],
                        response=response,
                    )
                    if metric_result:
                        findings.append({
                            "category": CATEGORY_MAP.get(metric_result.metric, metric_result.metric),
                            "severity": metric_result.severity,
                            "metric_name": metric_result.metric,
                            "description": metric_result.explanation,
                        })

        avg_latency = (
            round(total_latency / prompts_executed, 3)
            if prompts_executed > 0
            else None
        )

        return self._persist_active_audit(
            model,
            audit_public_id,
            findings,
            interactions,
            prompts_executed,
            avg_latency,
        )

    # =========================================================
    # PERSISTENCE
    # =========================================================
    def _persist_active_audit(
        self,
        model: AIModel,
        audit_public_id: str,
        findings: List[Dict],
        interactions: List[AuditInteraction],
        prompts_executed: int,
        avg_latency: Optional[float],
    ) -> AuditRun:

        critical = sum(1 for f in findings if f["severity"] == "CRITICAL")
        high = sum(1 for f in findings if f["severity"] == "HIGH")

        result = (
            "AUDIT_FAIL"
            if critical > 0
            else "AUDIT_WARN"
            if high > 0
            else "AUDIT_PASS"
        )

        audit = AuditRun(
            audit_id=audit_public_id,
            model_id=model.id,
            audit_type="active",
            executed_at=datetime.utcnow(),
            execution_status="SUCCESS",
            audit_result=result,
        )

        self.db.add(audit)
        self.db.flush()

        for interaction in interactions:
            interaction.audit_id = audit.id

        risk_score = min((critical * 30 + high * 15), 100)

        self.db.add(
            AuditSummary(
                audit_id=audit.id,
                drift_score=None,
                bias_score=None,
                risk_score=risk_score,
                total_findings=len(findings),
                critical_findings=critical,
                high_findings=high,
                metrics_snapshot={
                    "prompts_executed": prompts_executed,
                    "avg_latency_seconds": avg_latency,
                },
            )
        )

        for f in findings:
            self.db.add(
                AuditFinding(
                    finding_id=f"finding_{uuid.uuid4().hex[:8]}",
                    audit_id=audit.id,
                    category=f["category"],
                    severity=f["severity"],
                    metric_name=f["metric_name"],
                    description=f["description"],
                )
            )

        self.db.commit()
        return audit

    # =========================================================
    # NO EVIDENCE
    # =========================================================
    def _create_no_evidence_audit(
        self,
        model: AIModel,
        audit_public_id: str,
        reason: str,
    ) -> AuditRun:

        audit = AuditRun(
            audit_id=audit_public_id,
            model_id=model.id,
            audit_type="system",
            executed_at=datetime.utcnow(),
            execution_status="SUCCESS",
            audit_result="NO_EVIDENCE",
        )

        self.db.add(audit)
        self.db.flush()

        self.db.add(
            AuditSummary(
                audit_id=audit.id,
                drift_score=None,
                bias_score=None,
                risk_score=None,
                total_findings=0,
                critical_findings=0,
                high_findings=0,
                metrics_snapshot=None,
            )
        )

        self.db.add(
            AuditFinding(
                finding_id=f"finding_{uuid.uuid4().hex[:8]}",
                audit_id=audit.id,
                category="compliance",
                severity="INFO",
                metric_name="audit_status",
                description=reason,
            )
        )

        self.db.commit()
        return audit
