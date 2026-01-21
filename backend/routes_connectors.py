# backend/routes_connectors.py

from __future__ import annotations

import json
import time
from typing import Any, Dict, Optional

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(prefix="/connectors", tags=["Connectors"])


# ----------------------------
# Helpers
# ----------------------------
def _deep_get(obj: Any, path: str) -> Any:
    """
    Dot notation extractor:
    Example:
      path = "choices.0.message.content"
    """
    if not path:
        return obj

    cur = obj
    for part in path.split("."):
        if cur is None:
            return None

        # array index
        if part.isdigit():
            idx = int(part)
            if not isinstance(cur, list) or idx >= len(cur):
                return None
            cur = cur[idx]
            continue

        # dict key
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None

    return cur


# ----------------------------
# Request Schema
# ----------------------------
class ConnectorTestRequest(BaseModel):
    endpoint: str
    method: str = Field(default="POST")
    headers: Dict[str, str] = Field(default_factory=dict)

    request_template: Dict[str, Any]
    response_path: str = Field(default="response")

    test_prompt: str = Field(default="Say hello")

    timeout_seconds: int = Field(default=20, ge=1, le=60)


# ----------------------------
# Endpoint
# ----------------------------
@router.post("/test")
def test_connector(payload: ConnectorTestRequest):
    """
    Enterprise-style connectivity test:
    - Builds request body by replacing {{PROMPT}}
    - Sends request to endpoint
    - Extracts response from response_path
    - Returns latency + preview
    """

    if "{{PROMPT}}" not in json.dumps(payload.request_template):
        raise HTTPException(
            status_code=400,
            detail="request_template must include {{PROMPT}} placeholder",
        )

    method = (payload.method or "POST").upper().strip()
    if method not in ("POST", "GET"):
        raise HTTPException(status_code=400, detail="Only POST/GET supported")

    # Replace placeholder in template safely
    req_obj = json.loads(json.dumps(payload.request_template))
    req_str = json.dumps(req_obj)
    req_str = req_str.replace("{{PROMPT}}", payload.test_prompt)
    req_obj = json.loads(req_str)

    start = time.time()

    try:
        if method == "POST":
            r = requests.post(
                payload.endpoint,
                headers=payload.headers,
                json=req_obj,
                timeout=payload.timeout_seconds,
            )
        else:
            r = requests.get(
                payload.endpoint,
                headers=payload.headers,
                timeout=payload.timeout_seconds,
            )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Connector request failed: {str(exc)}")

    latency_ms = round((time.time() - start) * 1000, 2)

    # Basic HTTP validation
    if r.status_code >= 400:
        raise HTTPException(
            status_code=400,
            detail=f"Connector returned HTTP {r.status_code}: {r.text[:300]}",
        )

    # Try parse JSON
    raw_preview = r.text[:800]
    extracted_response: Optional[str] = None

    try:
        data = r.json()
        extracted = _deep_get(data, payload.response_path)
        if extracted is None:
            extracted_response = None
        elif isinstance(extracted, (dict, list)):
            extracted_response = json.dumps(extracted)[:1000]
        else:
            extracted_response = str(extracted)[:1000]
    except Exception:
        # Not JSON, just return plain
        data = None
        extracted_response = raw_preview

    return {
        "ok": True,
        "message": "Connector test successful",
        "latency_ms": latency_ms,
        "extracted_response": extracted_response,
        "raw_preview": raw_preview,
    }
