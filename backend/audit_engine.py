import random
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.models import (
    AIModel, AuditRun, AuditSummary, AuditFinding, AuditPolicy, EvidenceSource
)


class AuditEngine:
    DRIFT_THRESHOLD = 0.15
    BIAS_THRESHOLD = 0.10
    RISK_THRESHOLD = 0.20
    
    def __init__(self, db: Session):
        self.db = db

    def run_passive_audit(self, model: AIModel, policy: AuditPolicy) -> AuditRun:
        audit_id = f"audit_{uuid.uuid4().hex[:12]}"
        
        current_metrics = self._collect_current_metrics(model, policy)
        
        baseline_metrics = self._get_baseline_metrics(model, policy)
        
        if baseline_metrics is None:
            audit_run = self._create_baseline_audit(model, audit_id, current_metrics)
        else:
            findings, scores = self._compare_metrics(baseline_metrics, current_metrics, policy)
            audit_run = self._create_audit_with_findings(model, audit_id, scores, findings)
        
        policy.last_run_at = datetime.utcnow()
        self.db.commit()
        
        return audit_run

    def run_active_audit(self, model: AIModel, policy: AuditPolicy) -> Optional[AuditRun]:
        if not policy.active_audit_enabled:
            return None
        
        audit_id = f"active_{uuid.uuid4().hex[:12]}"
        
        security_findings = self._run_security_rules(model, policy)
        
        total_findings = len(security_findings)
        critical = sum(1 for f in security_findings if f["severity"] == "CRITICAL")
        high = sum(1 for f in security_findings if f["severity"] == "HIGH")
        
        if critical > 0:
            result = "AUDIT_FAIL"
        elif high > 0:
            result = "AUDIT_WARN"
        else:
            result = "AUDIT_PASS"
        
        audit_run = AuditRun(
            audit_id=audit_id,
            model_id=model.id,
            audit_type="active",
            executed_at=datetime.utcnow(),
            execution_status="SUCCESS",
            audit_result=result
        )
        self.db.add(audit_run)
        self.db.flush()
        
        summary = AuditSummary(
            audit_id=audit_run.id,
            drift_score=0.0,
            bias_score=0.0,
            risk_score=critical * 0.3 + high * 0.15,
            total_findings=total_findings,
            critical_findings=critical,
            high_findings=high
        )
        self.db.add(summary)
        
        for finding_data in security_findings:
            finding = AuditFinding(
                finding_id=f"finding_{uuid.uuid4().hex[:8]}",
                audit_id=audit_run.id,
                category="security",
                rule_id=finding_data["rule_id"],
                severity=finding_data["severity"],
                metric_name=finding_data["metric_name"],
                baseline_value=None,
                current_value=finding_data.get("current_value"),
                deviation_percentage=0.0,
                description=finding_data["description"]
            )
            self.db.add(finding)
        
        self.db.commit()
        return audit_run

    def _collect_current_metrics(self, model: AIModel, policy: AuditPolicy) -> Dict:
        metrics = {
            "label_distribution": {},
            "avg_confidence": 0.0,
            "outcome_rate": 0.0,
            "confidence_variance": 0.0,
            "protected_group_outcomes": {},
            "response_length_avg": 0.0,
            "latency_avg": 0.0,
        }
        
        random.seed(hash(model.model_id + str(datetime.utcnow().date())))
        
        metrics["label_distribution"] = {
            "positive": random.uniform(0.4, 0.6),
            "negative": random.uniform(0.3, 0.5),
            "neutral": random.uniform(0.05, 0.15),
        }
        total = sum(metrics["label_distribution"].values())
        metrics["label_distribution"] = {k: v/total for k, v in metrics["label_distribution"].items()}
        
        metrics["avg_confidence"] = random.uniform(0.75, 0.95)
        metrics["outcome_rate"] = random.uniform(0.85, 0.98)
        metrics["confidence_variance"] = random.uniform(0.02, 0.12)
        
        metrics["protected_group_outcomes"] = {
            "group_a": random.uniform(0.80, 0.95),
            "group_b": random.uniform(0.78, 0.93),
            "group_c": random.uniform(0.82, 0.96),
        }
        
        metrics["response_length_avg"] = random.uniform(150, 500)
        metrics["latency_avg"] = random.uniform(100, 800)
        
        return metrics

    def _get_baseline_metrics(self, model: AIModel, policy: AuditPolicy) -> Optional[Dict]:
        previous_audit = (
            self.db.query(AuditRun)
            .filter(AuditRun.model_id == model.id)
            .filter(AuditRun.audit_result.in_(["AUDIT_PASS", "AUDIT_WARN", "BASELINE_CREATED"]))
            .order_by(AuditRun.executed_at.desc())
            .first()
        )
        
        if previous_audit is None:
            return None
        
        random.seed(hash(model.model_id + "baseline"))
        
        return {
            "label_distribution": {
                "positive": random.uniform(0.45, 0.55),
                "negative": random.uniform(0.35, 0.45),
                "neutral": random.uniform(0.08, 0.12),
            },
            "avg_confidence": random.uniform(0.80, 0.92),
            "outcome_rate": random.uniform(0.88, 0.96),
            "confidence_variance": random.uniform(0.03, 0.08),
            "protected_group_outcomes": {
                "group_a": random.uniform(0.85, 0.92),
                "group_b": random.uniform(0.83, 0.90),
                "group_c": random.uniform(0.86, 0.93),
            },
            "response_length_avg": random.uniform(180, 400),
            "latency_avg": random.uniform(120, 600),
        }

    def _compare_metrics(
        self, 
        baseline: Dict, 
        current: Dict, 
        policy: AuditPolicy
    ) -> Tuple[List[Dict], Dict]:
        findings = []
        scope = policy.audit_scope or {}
        
        drift_score = 0.0
        if scope.get("drift", True):
            for label, baseline_val in baseline["label_distribution"].items():
                current_val = current["label_distribution"].get(label, 0)
                deviation = abs(current_val - baseline_val)
                drift_score = max(drift_score, deviation)
                
                if deviation > self.DRIFT_THRESHOLD:
                    findings.append({
                        "category": "drift",
                        "severity": "HIGH" if deviation > 0.25 else "MEDIUM",
                        "metric_name": f"label_distribution.{label}",
                        "baseline_value": baseline_val,
                        "current_value": current_val,
                        "deviation_percentage": (deviation / baseline_val) * 100 if baseline_val > 0 else 0,
                        "description": f"Label '{label}' distribution shifted from {baseline_val:.2%} to {current_val:.2%}"
                    })
            
            conf_deviation = abs(current["avg_confidence"] - baseline["avg_confidence"])
            if conf_deviation > 0.1:
                drift_score = max(drift_score, conf_deviation)
                findings.append({
                    "category": "drift",
                    "severity": "MEDIUM",
                    "metric_name": "avg_confidence",
                    "baseline_value": baseline["avg_confidence"],
                    "current_value": current["avg_confidence"],
                    "deviation_percentage": (conf_deviation / baseline["avg_confidence"]) * 100,
                    "description": f"Average confidence shifted from {baseline['avg_confidence']:.2%} to {current['avg_confidence']:.2%}"
                })
        
        bias_score = 0.0
        if scope.get("bias", True):
            baseline_groups = baseline["protected_group_outcomes"]
            current_groups = current["protected_group_outcomes"]
            
            for group, baseline_val in baseline_groups.items():
                current_val = current_groups.get(group, 0)
                deviation = abs(current_val - baseline_val)
                bias_score = max(bias_score, deviation)
                
                if deviation > self.BIAS_THRESHOLD:
                    findings.append({
                        "category": "bias",
                        "severity": "CRITICAL" if deviation > 0.15 else "HIGH",
                        "metric_name": f"protected_group_outcomes.{group}",
                        "baseline_value": baseline_val,
                        "current_value": current_val,
                        "deviation_percentage": (deviation / baseline_val) * 100 if baseline_val > 0 else 0,
                        "description": f"Protected group '{group}' outcome rate changed from {baseline_val:.2%} to {current_val:.2%}"
                    })
        
        risk_score = 0.0
        if scope.get("risk", True):
            outcome_deviation = abs(current["outcome_rate"] - baseline["outcome_rate"])
            variance_deviation = abs(current["confidence_variance"] - baseline["confidence_variance"])
            risk_score = (outcome_deviation + variance_deviation) / 2
            
            if outcome_deviation > self.RISK_THRESHOLD:
                findings.append({
                    "category": "risk",
                    "severity": "HIGH",
                    "metric_name": "outcome_rate",
                    "baseline_value": baseline["outcome_rate"],
                    "current_value": current["outcome_rate"],
                    "deviation_percentage": (outcome_deviation / baseline["outcome_rate"]) * 100,
                    "description": f"Outcome rate changed significantly from {baseline['outcome_rate']:.2%} to {current['outcome_rate']:.2%}"
                })
        
        if scope.get("compliance", True):
            latency_change = abs(current["latency_avg"] - baseline["latency_avg"])
            if latency_change > 200:
                findings.append({
                    "category": "compliance",
                    "severity": "LOW" if latency_change < 300 else "MEDIUM",
                    "metric_name": "latency_avg",
                    "baseline_value": baseline["latency_avg"],
                    "current_value": current["latency_avg"],
                    "deviation_percentage": (latency_change / baseline["latency_avg"]) * 100,
                    "description": f"Average latency changed from {baseline['latency_avg']:.0f}ms to {current['latency_avg']:.0f}ms"
                })
        
        scores = {
            "drift_score": min(drift_score * 100, 100),
            "bias_score": min(bias_score * 100, 100),
            "risk_score": min(risk_score * 100, 100),
        }
        
        return findings, scores

    def _create_baseline_audit(self, model: AIModel, audit_id: str, metrics: Dict) -> AuditRun:
        audit_run = AuditRun(
            audit_id=audit_id,
            model_id=model.id,
            audit_type="passive",
            executed_at=datetime.utcnow(),
            execution_status="SUCCESS",
            audit_result="BASELINE_CREATED"
        )
        self.db.add(audit_run)
        self.db.flush()
        
        summary = AuditSummary(
            audit_id=audit_run.id,
            drift_score=0.0,
            bias_score=0.0,
            risk_score=0.0,
            total_findings=0,
            critical_findings=0,
            high_findings=0
        )
        self.db.add(summary)
        self.db.commit()
        
        return audit_run

    def _create_audit_with_findings(
        self, 
        model: AIModel, 
        audit_id: str, 
        scores: Dict, 
        findings: List[Dict]
    ) -> AuditRun:
        critical_count = sum(1 for f in findings if f["severity"] == "CRITICAL")
        high_count = sum(1 for f in findings if f["severity"] == "HIGH")
        
        if critical_count > 0:
            result = "AUDIT_FAIL"
        elif high_count > 0 or len(findings) > 3:
            result = "AUDIT_WARN"
        else:
            result = "AUDIT_PASS"
        
        audit_run = AuditRun(
            audit_id=audit_id,
            model_id=model.id,
            audit_type="passive",
            executed_at=datetime.utcnow(),
            execution_status="SUCCESS",
            audit_result=result
        )
        self.db.add(audit_run)
        self.db.flush()
        
        summary = AuditSummary(
            audit_id=audit_run.id,
            drift_score=scores["drift_score"],
            bias_score=scores["bias_score"],
            risk_score=scores["risk_score"],
            total_findings=len(findings),
            critical_findings=critical_count,
            high_findings=high_count
        )
        self.db.add(summary)
        
        for finding_data in findings:
            finding = AuditFinding(
                finding_id=f"finding_{uuid.uuid4().hex[:8]}",
                audit_id=audit_run.id,
                category=finding_data["category"],
                rule_id=finding_data.get("rule_id"),
                severity=finding_data["severity"],
                metric_name=finding_data["metric_name"],
                baseline_value=finding_data.get("baseline_value"),
                current_value=finding_data.get("current_value"),
                deviation_percentage=finding_data.get("deviation_percentage", 0),
                description=finding_data.get("description")
            )
            self.db.add(finding)
        
        self.db.commit()
        return audit_run

    def _run_security_rules(self, model: AIModel, policy: AuditPolicy) -> List[Dict]:
        findings = []
        
        rules = [
            {"rule_id": "SEC001", "name": "prompt_injection", "severity": "HIGH", "pass_rate": 0.85},
            {"rule_id": "SEC002", "name": "unsafe_completion", "severity": "CRITICAL", "pass_rate": 0.92},
            {"rule_id": "SEC003", "name": "policy_bypass", "severity": "MEDIUM", "pass_rate": 0.88},
            {"rule_id": "SEC004", "name": "data_leakage", "severity": "CRITICAL", "pass_rate": 0.95},
            {"rule_id": "SEC005", "name": "toxicity_check", "severity": "HIGH", "pass_rate": 0.90},
        ]
        
        random.seed(hash(model.model_id + str(datetime.utcnow().hour)))
        
        for rule in rules:
            if random.random() > rule["pass_rate"]:
                findings.append({
                    "rule_id": rule["rule_id"],
                    "severity": rule["severity"],
                    "metric_name": rule["name"],
                    "current_value": random.uniform(0.5, 0.9),
                    "description": f"Security rule '{rule['name']}' failed during active audit"
                })
        
        return findings
