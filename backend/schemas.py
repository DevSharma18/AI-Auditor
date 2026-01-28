from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any

from pydantic import BaseModel
from pydantic.config import ConfigDict


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
    # ✅ Fix Pydantic protected namespace warning
    model_config = ConfigDict(protected_namespaces=())

    model_id: str
    name: str

    endpoint: str
    method: Optional[str] = "POST"

    headers: Dict[str, str]

    # PROVIDER-SPECIFIC FULL PAYLOAD TEMPLATE (must contain {{PROMPT}})
    request_template: Dict[str, Any]

    # RESPONSE EXTRACTION PATH
    response_path: str


class ModelResponse(BaseModel):
    # ✅ Fix Pydantic protected namespace warning
    model_config = ConfigDict(
        protected_namespaces=(),
        from_attributes=True
    )

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


class AuditResponse(BaseModel):
    # ✅ Fix Pydantic protected namespace warning
    model_config = ConfigDict(protected_namespaces=())

    id: int
    audit_id: str

    # internal numeric FK stored in your DB
    model_id: int

    audit_type: str
    executed_at: datetime
    execution_status: str
    audit_result: str
    findings_count: int
