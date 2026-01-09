import uuid
from datetime import datetime
from typing import Dict, List

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

        evidence = self.db.query(EvidenceSource).filter(
            EvidenceSource.model_id == model.id
        ).first()

        if not evidence:
            raise RuntimeError("No EvidenceSource configured")

        executor = ModelExecutor(evidence.config)

        interactions: List[Dict] = []
        findings: List[Dict] = []

        for category, prompts in PROMPT_CATEGORIES.items():
            metric = self.metric_registry.get(category)

            for p in prompts:
                execution = executor.execute_active_prompt(p["prompt"])

                interactions.append({
                    "prompt_id": p["id"],
                    "prompt": p["prompt"],
                    "response": execution["content"],
                    "latency": round(execution["latency"] * 1000, 2),
                })

                if metric:
                    result = metric.evaluate(
                        prompt=p["prompt"],
                        response=execution["content"],  #string
                    )
                    if result:
                        findings.append({
                            "category": category,
                            "severity": result.severity,
                            "metric_name": result.metric,
                            "description": result.explanation,
                        })

        audit = AuditRun(
            audit_id=audit_public_id,
            model_id=model.id,
            audit_type="active",
            executed_at=datetime.utcnow(),
            execution_status="SUCCESS",
            audit_result="AUDIT_PASS",
        )

        self.db.add(audit)
        self.db.flush()

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

        print("🔥 INSERTING INTERACTIONS:", len(interactions))

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

        self.db.add(
            AuditSummary(
                audit_id=audit.id,
                total_findings=len(findings),
                critical_findings=0,
                high_findings=0,
            )
        )

        self.db.commit()
        return audit
