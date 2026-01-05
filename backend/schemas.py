from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# =========================
# ENUMS
# =========================

class ModelType(str, Enum):
    LLM = "llm"
    ML = "ml"


class ConnectionType(str, Enum):
    API = "api"
    LOGS = "logs"
    BATCH = "batch"
    CONTAINER = "container"
    SAMPLE = "sample"


class AuditFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ExecutionStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class AuditResultEnum(str, Enum):
    AUDIT_PASS = "AUDIT_PASS"
    AUDIT_WARN = "AUDIT_WARN"
    AUDIT_FAIL = "AUDIT_FAIL"
    BASELINE_CREATED = "BASELINE_CREATED"
    NO_EVIDENCE = "NO_EVIDENCE"


class Severity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FindingCategory(str, Enum):
    DRIFT = "drift"
    BIAS = "bias"
    RISK = "risk"
    COMPLIANCE = "compliance"
    SECURITY = "security"
    SYSTEM = "system"


# =========================
# MODEL REGISTRATION
# =========================

class ModelRegister(BaseModel):
    model_id: str
    name: str
    version: str = "1.0"
    model_type: str = "llm"
    connection_type: str = "api"


class ModelResponse(BaseModel):
    id: int
    model_id: str
    name: str
    version: str
    model_type: str
    connection_type: str
    created_at: datetime
    last_audit_status: Optional[str] = None
    last_audit_time: Optional[datetime] = None
    audit_frequency: Optional[str] = None

    class Config:
        from_attributes = True


# =========================
# EVIDENCE SOURCES
# =========================

class EvidenceSourceCreate(BaseModel):
    model_id: int
    source_type: str
    config: Dict[str, Any]
    read_only: bool = True


class EvidenceSourceResponse(BaseModel):
    id: int
    model_id: int
    source_type: str
    config: Dict[str, Any]
    read_only: bool
    last_fetch_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================
# AUDIT POLICIES
# =========================

class AuditPolicyCreate(BaseModel):
    model_id: int
    audit_frequency: str = "daily"
    baseline_strategy: str = "previous_audit"
    audit_scope: Dict[str, bool] = {
        "drift": True,
        "bias": True,
        "risk": True,
        "compliance": True,
        "active_security": False
    }
    policy_reference: Dict[str, Any] = {}
    active_audit_enabled: bool = False


class AuditPolicyResponse(BaseModel):
    id: int
    model_id: int
    audit_frequency: str
    baseline_strategy: str
    audit_scope: Dict[str, bool]
    policy_reference: Dict[str, Any]
    active_audit_enabled: bool
    last_run_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================
# AUDIT FINDINGS
# =========================

class FindingResponse(BaseModel):
    id: int
    finding_id: str
    audit_id: int
    category: str
    rule_id: Optional[str]
    severity: str
    metric_name: str
    baseline_value: Optional[float]
    current_value: Optional[float]
    deviation_percentage: Optional[float]
    description: Optional[str]

    class Config:
        from_attributes = True


# =========================
# AUDIT SUMMARY / RESPONSE
# =========================

class AuditSummaryResponse(BaseModel):
    drift_score: Optional[float] = None
    bias_score: Optional[float] = None
    risk_score: Optional[float] = None
    total_findings: int = 0
    critical_findings: int = 0
    high_findings: int = 0

    class Config:
        from_attributes = True


class AuditResponse(BaseModel):
    id: int
    audit_id: str
    model_id: int
    model_name: Optional[str] = None
    audit_type: str
    scheduled_at: Optional[datetime]
    executed_at: datetime
    execution_status: str
    audit_result: str
    summary: Optional[AuditSummaryResponse] = None
    findings_count: int = 0

    class Config:
        from_attributes = True


# =========================
# DASHBOARD
# =========================

class DashboardMetrics(BaseModel):
    total_models: int
    total_audits: int
    passed_audits: int
    failed_audits: int
    critical_findings_count: int
    high_findings_count: int
    overall_risk_score: Optional[float] = None
    audit_status_distribution: Dict[str, int]
    drift_score_percentage: Optional[float] = None


class DashboardOverview(BaseModel):
    status: str
    message: str
    metrics: Optional[DashboardMetrics] = None


class ModelMetrics(BaseModel):
    total_audits: int
    passed_audits: int
    failed_audits: int
    last_audit_status: Optional[str]
    last_audit_time: Optional[datetime]
    avg_drift_score: Optional[float] = None
    avg_bias_score: Optional[float] = None
    avg_risk_score: Optional[float] = None
    recent_findings: List[FindingResponse]


class ModelDashboard(BaseModel):
    model_id: str
    model_name: str
    model_version: str
    connection_type: str
    status: str
    message: str
    baseline_established: bool = False
    metrics: Optional[ModelMetrics] = None
