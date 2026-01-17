import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from .models import (
    AIModel,
    AuditRun,
    AuditSummary,
    AuditFinding,
    EvidenceSource,
    AuditInteraction,
)

from .model_executor import ModelExecutor
from .audit_prompts import PROMPT_CATEGORIES

from .metrics.hallucination import HallucinationMetric
from .metrics.bias import BiasMetric
from .metrics.pii import PIIMetric


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


class AuditEngine:
    def __init__(self, db: Session):
        self.db = db

        self.metric_registry = {
            "hallucination": HallucinationMetric(),
            "bias": BiasMetric(),
            "pii": PIIMetric(),
        }

    def run_active_audit(self, model: AIModel, policy=None) -> AuditRun:
        audit_public_id = f"active_{uuid.uuid4().hex[:12]}"

        # ✅ pick the connector
        evidence = (
            self.db.query(EvidenceSource)
            .filter(EvidenceSource.model_id == model.id, EvidenceSource.source_type == "api")
            .first()
        )

        if not evidence:
            raise RuntimeError("No EvidenceSource configured for this model")

        executor = ModelExecutor(evidence.config)

        interactions: List[Dict] = []
        findings: List[Dict] = []

        prompts_executed = 0
        total_latency = 0.0

        for category, prompts in PROMPT_CATEGORIES.items():
            metric = self.metric_registry.get(category)

            for p in prompts:
                # -----------------------------
                # Execute prompt against provider
                # -----------------------------
                try:
                    execution = executor.execute_active_prompt(p["prompt"])
                    response_text = execution.get("raw_response", "")
                    latency_seconds = float(execution.get("latency", 0.0))
                except Exception as exc:
                    # store a finding for operational visibility
                    findings.append(
                        {
                            "category": "compliance",
                            "severity": "HIGH",
                            "metric_name": "execution_failure",
                            "description": str(exc),
                        }
                    )
                    continue

                prompts_executed += 1
                total_latency += latency_seconds

                interactions.append(
                    {
                        "prompt_id": p["id"],
                        "prompt": p["prompt"],
                        "response": response_text if isinstance(response_text, str) else str(response_text),
                        "latency": round(latency_seconds * 1000, 2),  # store ms
                    }
                )

                # -----------------------------
                # Metric evaluation (prompt-agnostic)
                # -----------------------------
                if metric:
                    result = metric.evaluate(prompt=p["prompt"], response=response_text)

                    if result:
                        findings.append(
                            {
                                "category": CATEGORY_MAP.get(result.metric, category),
                                "severity": result.severity,
                                "metric_name": result.metric,
                                "description": result.explanation,
                            }
                        )

        # -----------------------------
        # Audit result classification
        # -----------------------------
        critical = sum(1 for f in findings if f["severity"] == "CRITICAL")
        high = sum(1 for f in findings if f["severity"] == "HIGH")

        audit_result = (
            "AUDIT_FAIL"
            if critical > 0
            else "AUDIT_WARN"
            if high > 0
            else "AUDIT_PASS"
        )

        avg_latency_seconds: Optional[float] = None
        if prompts_executed > 0:
            avg_latency_seconds = round(total_latency / prompts_executed, 3)

        # -----------------------------
        # Persist audit run
        # -----------------------------
        audit = AuditRun(
            audit_id=audit_public_id,
            model_id=model.id,
            audit_type="active",
            executed_at=datetime.utcnow(),
            execution_status="SUCCESS",
            audit_result=audit_result,
        )

        self.db.add(audit)
        self.db.flush()

        # -----------------------------
        # Persist interactions
        # -----------------------------
        for i in interactions:
            self.db.add(
                AuditInteraction(
                    audit_id=audit.id,
                    prompt_id=i["prompt_id"],
                    prompt=i["prompt"],
                    response=i["response"],
                    latency=i["latency"],
                )
            )

        # ✅ This print is correct now
        print("🔥 INSERTING INTERACTIONS:", len(interactions))

        self.db.flush()

        # -----------------------------
        # Persist summary
        # -----------------------------
        self.db.add(
            AuditSummary(
                audit_id=audit.id,
                drift_score=None,
                bias_score=None,
                risk_score=min((critical * 30 + high * 15), 100),
                total_findings=len(findings),
                critical_findings=critical,
                high_findings=high,
                metrics_snapshot={
                    "prompts_executed": prompts_executed,
                    "avg_latency_seconds": avg_latency_seconds,
                },
            )
        )

        # -----------------------------
        # Persist findings
        # -----------------------------
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
