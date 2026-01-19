from __future__ import annotations

from typing import Dict, Any, List


def explain_category(category: str) -> Dict[str, Any]:
    """
    Returns non-technical explanation for a category.
    Used in Reports UI + PDF report.
    """
    c = (category or "").lower().strip()

    if c == "bias":
        return {
            "title": "Bias Risk",
            "simple_definition": "The model may treat certain groups unfairly.",
            "why_it_matters": "Bias can cause discrimination, reputational damage, and regulatory issues.",
            "business_impact": [
                "Unfair user outcomes",
                "Regulatory compliance risk",
                "Loss of customer trust",
            ],
        }

    if c == "pii":
        return {
            "title": "PII Exposure Risk",
            "simple_definition": "The model may reveal personal or sensitive information.",
            "why_it_matters": "PII exposure increases legal risk and can lead to security incidents.",
            "business_impact": [
                "Data protection violations",
                "Customer privacy breaches",
                "Increased breach liability",
            ],
        }

    if c == "hallucination":
        return {
            "title": "Hallucination Risk",
            "simple_definition": "The model may produce confident but incorrect information.",
            "why_it_matters": "Incorrect outputs may cause financial harm, bad decisions, or safety risks.",
            "business_impact": [
                "Wrong decisions",
                "Operational mistakes",
                "Legal / compliance exposure",
            ],
        }

    if c == "compliance":
        return {
            "title": "Compliance Risk",
            "simple_definition": "The model may violate policies or regulations.",
            "why_it_matters": "Non-compliance can lead to fines, audits, and legal consequences.",
            "business_impact": [
                "Policy violations",
                "Regulatory fines",
                "Audit failures",
            ],
        }

    if c == "drift":
        return {
            "title": "Model Drift Risk",
            "simple_definition": "Model behavior may change over time from its expected baseline.",
            "why_it_matters": "Drift can silently reduce accuracy and increase unsafe or inconsistent outputs.",
            "business_impact": [
                "Unexpected model behavior",
                "Lower prediction reliability",
                "Hidden performance degradation",
            ],
        }

    return {
        "title": "Risk Finding",
        "simple_definition": "A risk was detected in model output behavior.",
        "why_it_matters": "Risk findings can impact reliability, safety, and trust.",
        "business_impact": ["Operational risk", "Trust risk"],
    }


def remediation_steps(category: str, severity: str, metric_name: str | None = None) -> Dict[str, Any]:
    """
    Returns remediation guidance in a business-friendly way.
    This is generic for now, later you can customize per metric_name.
    """
    c = (category or "").lower().strip()
    s = (severity or "").upper().strip()
    metric = (metric_name or "").strip()

    priority = "STANDARD"
    if s == "CRITICAL":
        priority = "IMMEDIATE"
    elif s == "HIGH":
        priority = "URGENT"
    elif s == "MEDIUM":
        priority = "PLANNED"

    base_steps: List[str] = [
        "Review the prompt/response evidence to confirm impact.",
        "Identify which user flows or features are affected.",
        "Apply mitigation and re-run an audit to validate improvements.",
    ]

    if c == "pii":
        extra = [
            "Mask or redact sensitive outputs (emails, phone numbers, IDs, addresses).",
            "Add PII detection filters before logging and before final response display.",
            "Disable model from returning secrets via allow-listing output types.",
            "Review retention policy for stored prompts and outputs.",
        ]
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": extra + base_steps,
            "recommended_owner": "Security / Privacy",
        }

    if c == "bias":
        extra = [
            "Expand fairness test coverage using diverse demographic prompts.",
            "Add policy constraints to reject discriminatory outputs.",
            "Tune system prompts or guardrails to enforce fairness rules.",
            "Monitor bias severity trends over time and compare across models.",
        ]
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": extra + base_steps,
            "recommended_owner": "AI Governance",
        }

    if c == "hallucination":
        extra = [
            "Introduce retrieval grounding (RAG) for factual queries.",
            "Add citations or confidence thresholds for factual answers.",
            "Block unsupported claims and enforce refusal behavior when uncertain.",
            "Add verification prompts or secondary checks for critical workflows.",
        ]
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": extra + base_steps,
            "recommended_owner": "AI Engineering",
        }

    if c == "compliance":
        extra = [
            "Map violations to applicable policies and compliance standards.",
            "Add policy guardrails and response constraints.",
            "Ensure logs contain audit evidence but exclude sensitive data.",
            "Require human review for high-risk policy categories.",
        ]
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": extra + base_steps,
            "recommended_owner": "Risk / Compliance",
        }

    if c == "drift":
        extra = [
            "Establish baseline behavior metrics for the model.",
            "Track changes across time windows and compare against baseline thresholds.",
            "Trigger alerts when drift exceeds acceptable boundaries.",
            "Re-train or re-calibrate if performance degradation is confirmed.",
        ]
        return {
            "priority": priority,
            "metric": metric,
            "fix_steps": extra + base_steps,
            "recommended_owner": "ML Ops",
        }

    return {
        "priority": priority,
        "metric": metric,
        "fix_steps": base_steps,
        "recommended_owner": "Engineering",
    }
