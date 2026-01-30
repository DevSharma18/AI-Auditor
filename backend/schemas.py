from __future__ import annotations
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict

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
    
    description: Optional[str] = None

    # ✅ SILENCE WARNING: Allow fields starting with "model_"
    model_config = ConfigDict(protected_namespaces=())


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

    # ✅ SILENCE WARNING + ORM MODE
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class AuditResponse(BaseModel):
    id: int
    audit_id: str
    model_id: int
    audit_type: str
    executed_at: datetime
    execution_status: str
    audit_result: str
    findings_count: int

    # ✅ SILENCE WARNING + ORM MODE
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())