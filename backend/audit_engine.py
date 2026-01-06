import uuid
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from audit_prompts import ACTIVE_AUDIT_PROMPTS
from rule_engine.hallucination import HallucinationRule

from models import (
    AIModel,
    AuditRun,
    AuditSummary,
    AuditFinding,
    AuditPolicy,
    EvidenceSource,
)

from model_executor import ModelExecutor


class AuditEngine:
    """
    Core auditing engine.
    - Passive audits: telemetry / logs (stubbed intentionally)
    - Active audits: live prompt execution against model endpoint
    """

    def __init__(self, db: Session):
        self.db = db

    # =========================================================
    # PASSIVE AUDIT (LOGS / METRICS)
    # =========================================================

    def run_passive_audit(
        self,
        model: AIModel,
        policy: AuditPolicy,
        audit_window_start: Optional[datetime] = None,
        audit_window_end: Optional[datetime] = None,
    ) -> AuditRun:
        audit_id = f"audit_{uuid.uuid4().hex[:12]}"

        evidence_sources = (
            self.db.query(EvidenceSource)
            .filter(EvidenceSource.model_id == model.id)
            .all()
        )

        if not evidence_sources:
            return self._create_no_evidence_audit(
                model,
                audit_id,
                "No evidence sources configured",
            )

        # IMPORTANT:
        # Passive audits MUST NOT fabricate metrics.
        # Until ingestion pipeline exists, explicitly return NO_EVIDENCE.
        return self._create_no_evidence_audit(
            model,
            audit_id,
            "Passive telemetry ingestion not yet enabled",
        )

    # =========================================================
    # ACTIVE AUDIT (LIVE MODEL PROMPTING)
    # =========================================================

    def run_active_audit(
        self,
        model: AIModel,
        policy: AuditPolicy,
    ) -> AuditRun:
        audit_id = f"active_{uuid.uuid4().hex[:12]}"

        evidence_source = (
            self.db.query(EvidenceSource)
            .filter(
                EvidenceSource.model_id == model.id,
                EvidenceSource.source_type == "api",
            )
            .first()
        )

        if not evidence_source:
            return self._create_no_evidence_audit(
                model,
                audit_id,
                "No API connector configured",
            )

        # Initialize executor strictly from stored config
        executor = ModelExecutor(evidence_source.config)

        # Active rules (expand later)
        rules = [
            HallucinationRule(),
            # BiasRule(),
            # PIIRule(),
            # ComplianceRule(),
        ]

        findings: List[Dict] = []
        prompts_executed = 0

        for category, prompts in ACTIVE_AUDIT_PROMPTS.items():
            for prompt_def in prompts:
                prompt_text = prompt_def["prompt"]

                try:
                    execution = executor.execute_active_prompt(prompt_text)
                    response = execution["raw_response"]
                    prompts_executed += 1

                except Exception as exc:
                    findings.append(
                        {
                            "category": "system",
                            "rule_id": "EXECUTION_FAILURE",
                            "severity": "HIGH",
                            "metric_name": category,
                            "description": f"Prompt execution failed: {str(exc)}",
                        }
                    )
                    continue

                for rule in rules:
                    rule_result = rule.evaluate(
                        prompt=prompt_text,
                        response=response,
                    )

                    if rule_result:
                        findings.append(
                            {
                                "category": rule_result.category,
                                "rule_id": rule_result.rule_id,
                                "severity": rule_result.severity,
                                "metric_name": category,
                                "description": rule_result.description,
                            }
                        )

        return self._persist_active_audit(
            model=model,
            audit_id=audit_id,
            findings=findings,
            prompts_executed=prompts_executed,
        )

    # =========================================================
    # PERSISTENCE
    # =========================================================

    def _persist_active_audit(
        self,
        model: AIModel,
        audit_id: str,
        findings: List[Dict],
        prompts_executed: int,
    ) -> AuditRun:
        critical = sum(1 for f in findings if f["severity"] == "CRITICAL")
        high = sum(1 for f in findings if f["severity"] == "HIGH")

        if critical > 0:
            result = "AUDIT_FAIL"
        elif high > 0:
            result = "AUDIT_WARN"
        else:
            result = "AUDIT_PASS"

        audit = AuditRun(
            audit_id=audit_id,
            model_id=model.id,
            audit_type="active",
            executed_at=datetime.utcnow(),
            execution_status="SUCCESS",
            audit_result=result,
        )
        self.db.add(audit)
        self.db.flush()

        summary = AuditSummary(
            audit_id=audit.id,
            drift_score=None,
            bias_score=None,
            risk_score=min((critical * 30 + high * 15), 100),
            total_findings=len(findings),
            critical_findings=critical,
            high_findings=high,
            metrics_snapshot={
                "active_prompts_executed": prompts_executed
            },
        )
        self.db.add(summary)

        for f in findings:
            self.db.add(
                AuditFinding(
                    finding_id=f"finding_{uuid.uuid4().hex[:8]}",
                    audit_id=audit.id,
                    category=f["category"],
                    rule_id=f["rule_id"],
                    severity=f["severity"],
                    metric_name=f["metric_name"],
                    description=f["description"],
                )
            )

        self.db.commit()
        return audit

    # =========================================================
    # NO-EVIDENCE HANDLER
    # =========================================================

    def _create_no_evidence_audit(
        self,
        model: AIModel,
        audit_id: str,
        reason: str,
    ) -> AuditRun:
        audit = AuditRun(
            audit_id=audit_id,
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
                category="system",
                severity="INFO",
                metric_name="audit_status",
                description=reason,
            )
        )

        self.db.commit()
        return audit
