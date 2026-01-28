# backend/report_builder.py

from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


def _safe(v: Any) -> str:
    return "" if v is None else str(v)


def _norm_category(v: str) -> str:
    return (v or "").strip().lower()


def _norm_severity(v: str) -> str:
    return (v or "").strip().upper()


def _norm_metric(v: str) -> str:
    return (v or "").strip().lower()


def _norm_desc(v: str) -> str:
    d = (v or "").strip()
    d_low = d.lower()
    if len(d_low) > 160:
        d_low = d_low[:160]
    return d_low


def _fingerprint_dict_finding(f: Dict[str, Any]) -> str:
    category = _norm_category(_safe(f.get("category")))
    metric = _norm_metric(_safe(f.get("metric_name")))
    desc = _norm_desc(_safe(f.get("description")))
    return f"{category}::{metric}::{desc}"


def _severity_rank(sev: str) -> int:
    s = _norm_severity(sev)
    if s == "CRITICAL":
        return 4
    if s == "HIGH":
        return 3
    if s == "MEDIUM":
        return 2
    if s == "LOW":
        return 1
    return 0


def build_structured_report(
    audit: Dict[str, Any],
    findings: List[Dict[str, Any]],
    interactions: List[Dict[str, Any]],
    metric_scores: List[Dict[str, Any]] | None = None,
    global_risk: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Enterprise structured report:
    - Deduplicates findings into "issues"
    - Adds occurrences count
    - Adds limited evidence references (IDs + metadata only)
    - Includes metric scoring + global risk
    - Does NOT dump all prompt/response logs
    """

    metric_scores = metric_scores or []
    global_risk = global_risk or {}

    # Index interactions by id (internal linkage only)
    interaction_by_id: Dict[int, Dict[str, Any]] = {}
    for i in interactions:
        iid = i.get("interaction_id")
        if isinstance(iid, int):
            interaction_by_id[iid] = i

    # ----------------------------
    # SUMMARY
    # ----------------------------
    severity_counts = Counter(_norm_severity(_safe(f.get("severity", "UNKNOWN"))) for f in findings)
    category_counts = Counter(_norm_category(_safe(f.get("category", "unknown"))) for f in findings)

    summary = {
        "total_findings_raw": len(findings),
        "total_interactions": len(interactions),
        "by_severity": {sev: int(severity_counts.get(sev, 0)) for sev in SEVERITY_ORDER},
        "by_category": {k.upper(): int(v) for k, v in category_counts.items()},
    }

    # ----------------------------
    # GROUP FINDINGS (DEDUP)
    # ----------------------------
    grouped_map: Dict[str, Dict[str, Any]] = {}
    grouped_order: List[str] = []

    for f in findings:
        fp = _fingerprint_dict_finding(f)

        if fp not in grouped_map:
            grouped_order.append(fp)

            category = _norm_category(_safe(f.get("category")))
            metric_name = _safe(f.get("metric_name")).strip()
            initial_severity = _norm_severity(_safe(f.get("severity")))

            grouped_map[fp] = {
                "issue_id": fp,
                "category": category.upper() if category else "UNKNOWN",
                "severity": initial_severity if initial_severity else "UNKNOWN",
                "metric_name": metric_name,
                "description": _safe(f.get("description")).strip(),
                "explain": f.get("explain") or None,
                "remediation": f.get("remediation") or None,
                "occurrences": 0,

                # evidence references only (do not include raw text)
                "evidence_samples": [],
            }

        grouped_map[fp]["occurrences"] += 1

        # keep highest severity
        current_sev = grouped_map[fp].get("severity", "UNKNOWN")
        incoming_sev = _norm_severity(_safe(f.get("severity")))
        if _severity_rank(incoming_sev) > _severity_rank(current_sev):
            grouped_map[fp]["severity"] = incoming_sev

        # Add evidence sample (max 3 refs per issue)
        if len(grouped_map[fp]["evidence_samples"]) < 3:
            interaction_id = f.get("interaction_id")
            prompt_id = f.get("prompt_id")

            evidence_item = {
                "finding_id": _safe(f.get("finding_id")),
                "prompt_id": prompt_id,
                "interaction_id": interaction_id,
                "created_at": None,
                "latency_ms": None,
            }

            # attach only metadata
            if isinstance(interaction_id, int) and interaction_id in interaction_by_id:
                src = interaction_by_id[interaction_id]
                evidence_item["created_at"] = src.get("created_at")
                evidence_item["latency_ms"] = src.get("latency_ms")

            grouped_map[fp]["evidence_samples"].append(evidence_item)

    grouped_findings = [grouped_map[k] for k in grouped_order]

    # ----------------------------
    # EXECUTIVE SUMMARY LINES
    # ----------------------------
    critical = summary["by_severity"].get("CRITICAL", 0)
    high = summary["by_severity"].get("HIGH", 0)
    medium = summary["by_severity"].get("MEDIUM", 0)
    low = summary["by_severity"].get("LOW", 0)

    risk_level = "LOW"
    if critical > 0:
        risk_level = "HIGH"
    elif high >= 3:
        risk_level = "MEDIUM"

    executive_summary = [
        f"Overall risk level: {risk_level}.",
        f"Unique issues detected: {len(grouped_findings)}.",
        f"Raw findings recorded: {len(findings)} (deduplicated in this report).",
        f"Severity totals — CRITICAL: {critical}, HIGH: {high}, MEDIUM: {medium}, LOW: {low}.",
    ]

    # ----------------------------
    # TOP-LEVEL EVIDENCE SAMPLES (for PDF)
    # - keep max 3 across whole report
    # - references only (no raw prompt/response)
    # ----------------------------
    flat_evidence: List[Dict[str, Any]] = []
    for issue in grouped_findings:
        for e in issue.get("evidence_samples", []) or []:
            if len(flat_evidence) >= 3:
                break
            flat_evidence.append(e)
        if len(flat_evidence) >= 3:
            break

    # ----------------------------
    # FINAL STRUCTURE (Stable Contract)
    # ----------------------------
    return {
        "audit": audit,
        "summary": summary,
        "executive_summary": executive_summary,

        "global_risk": global_risk,
        "metric_scores": metric_scores,

        "grouped_findings": grouped_findings,
        "unique_issue_count": len(grouped_findings),

        # ✅ used by report_pdf_reportlab.py
        "evidence_samples": flat_evidence,
    }
