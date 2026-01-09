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


# =========================
# MODEL REGISTRATION
# =========================

class RegisterModelRequest(BaseModel):
    model_id: str
    name: str

    endpoint: str
    method: Optional[str] = "POST"
    headers: Dict[str, str]

    # 🔑 FULL PROVIDER-SPECIFIC BODY TEMPLATE
    request_template: Dict[str, Any]

    # 🔑 RESPONSE EXTRACTION PATH (e.g. choices[0].message.content)
    response_path: str


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
# AUDIT RESPONSE
# =========================

class AuditResponse(BaseModel):
    id: int
    audit_id: str
    model_id: int
    audit_type: str
    executed_at: datetime
    execution_status: str
    audit_result: str
    findings_count: int
