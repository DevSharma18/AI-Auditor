from __future__ import annotations

from typing import Dict, Any, List
from collections import Counter


def build_structured_report(
    audit: Dict[str, Any],
    findings: List[Dict[str, Any]],
    interactions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Generates a structured JSON report that is:
    - easy to understand for non-technical users
    - organized for frontend rendering
    - compatible with PDF report generation

    Inputs are already enriched findings (with explain + remediation).
    """

    # ---- counts ----
    counts = {
        "findings_total": len(findings),
        "interactions_total": len(interactions),
    }

    # ---- severity counts ----
    sev_counts = Counter((f.get("severity") or "UNKNOWN").upper() for f in findings)
    cat_counts = Counter((f.get("category") or "unknown").lower() for f in findings)

    # ---- category buckets ----
    findings_by_category: Dict[str, List[Dict[str, Any]]] = {}
    for f in findings:
        c = (f.get("category") or "unknown").lower()
        findings_by_category.setdefault(c, []).append(f)

    # ---- executive summary (non technical) ----
    executive_summary: List[str] = []

    audit_result = (audit.get("audit_result") or "").upper()
    if audit_result:
        executive_summary.append(f"Overall audit result: {audit_result.replace('_', ' ')}.")

    if counts["findings_total"] == 0:
        executive_summary.append("No risks were detected in the evaluated checks.")
    else:
        executive_summary.append(
            f"{counts['findings_total']} total risk finding(s) were detected across "
            f"{len(findings_by_category)} categories."
        )

        top_categories = cat_counts.most_common(3)
        if top_categories:
            top_str = ", ".join([f"{k.upper()} ({v})" for k, v in top_categories])
            executive_summary.append(f"Top affected categories: {top_str}.")

        critical = sev_counts.get("CRITICAL", 0)
        high = sev_counts.get("HIGH", 0)
        if critical > 0:
            executive_summary.append(
                f"{critical} critical issue(s) require immediate remediation to reduce business risk."
            )
        elif high > 0:
            executive_summary.append(
                f"{high} high severity issue(s) should be prioritized in the next mitigation cycle."
            )

    # ---- simple score (0-100) ----
    # This is a simple deterministic score you can tune later.
    critical = sev_counts.get("CRITICAL", 0)
    high = sev_counts.get("HIGH", 0)
    medium = sev_counts.get("MEDIUM", 0)
    low = sev_counts.get("LOW", 0)

    risk_score = 100 - (critical * 25 + high * 15 + medium * 8 + low * 3)
    if risk_score < 0:
        risk_score = 0

    # ---- return report ----
    return {
        "audit": audit,
        "executive_summary": executive_summary,
        "risk_score": risk_score,
        "counts": counts,
        "breakdown": {
            "by_severity": dict(sev_counts),
            "by_category": dict(cat_counts),
        },
        "findings": findings,
        "findings_by_category": findings_by_category,
        "interactions": interactions,
        "non_technical_glossary": {
            "bias": "Unfair or unequal treatment of certain groups in model decisions or outputs.",
            "pii": "Exposure of private personal information such as phone numbers, emails, IDs, or addresses.",
            "hallucination": "Model output that appears confident but is factually incorrect or unsupported.",
            "compliance": "Violations of policy, regulatory requirements, or organizational rules.",
            "drift": "Model behavior changes over time compared to baseline expectations or training patterns.",
        },
    }
