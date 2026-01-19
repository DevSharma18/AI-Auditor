from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# =========================
# ENUMS
# =========================

class ExecutionStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class AuditResultEnum(str, Enum):
    AUDIT_PASS = "AUDIT_PASS"
    AUDIT_WARN = "AUDIT_WARN"
    AUDIT_FAIL = "AUDIT_FAIL"
    NO_EVIDENCE = "NO_EVIDENCE"


# =========================
# MODEL REGISTRATION
# =========================

class RegisterModelRequest(BaseModel):
    model_id: str
    name: str

    endpoint: str
    method: Optional[str] = "POST"

    headers: Dict[str, str]

    # 🔑 PROVIDER-SPECIFIC FULL PAYLOAD TEMPLATE
    request_template: Dict[str, Any]

    # 🔑 RESPONSE EXTRACTION PATH
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


class AuditResponse(BaseModel):
    id: int
    audit_id: str
    model_id: int
    audit_type: str
    executed_at: datetime
    execution_status: str
    audit_result: str
    findings_count: int
