from __future__ import annotations

from typing import Dict, Tuple, Optional, Any

from .normalization import clamp01
from .regulations import REGULATORY_WEIGHTS


def compute_regulatory_weight(metric_name: str, finding_extra: Optional[Dict[str, Any]] = None) -> Tuple[float, Dict[str, float]]:
    """
    Returns:
    - R in [0..1] using max across frameworks
    - framework breakdown dict

    ✅ UPDATED: Accepts 'finding_extra' to support live data from the audit engine.
    If 'finding_extra' contains 'reg_scores', those specific scores take precedence
    over the static defaults.
    """

    # 1. Try to use Live Data from the finding itself (if available)
    if finding_extra and "reg_scores" in finding_extra:
        raw_scores = finding_extra["reg_scores"]
        cleaned: Dict[str, float] = {}
        
        for k, v in raw_scores.items():
            try:
                # Store the coverage score directly (e.g. 0.95 for 95% coverage)
                cleaned[str(k)] = clamp01(float(v))
            except Exception:
                cleaned[str(k)] = 0.0
        
        # Calculate Regulatory Weight (R)
        # R represents RISK. 
        # High Compliance Coverage (e.g. 0.95) = Low Risk (0.05)
        # We invert the average coverage to get the risk weight.
        if cleaned:
            avg_coverage = sum(cleaned.values()) / len(cleaned)
            weight_r = clamp01(1.0 - avg_coverage)
            return weight_r, cleaned

    # 2. Fallback to Static Defaults (if no live data)
    m = (metric_name or "").strip().lower()

    breakdown = REGULATORY_WEIGHTS.get(m, {}) or {}
    cleaned: Dict[str, float] = {}

    for k, v in breakdown.items():
        try:
            cleaned[str(k)] = clamp01(float(v))
        except Exception:
            cleaned[str(k)] = 0.0

    if not cleaned:
        # Unknown metric - treat as weak regulatory mapping (Risk = 0.3)
        # Default breakdown assumes low coverage/high risk if unknown
        return 0.3, {"GDPR": 0.3, "EUAI": 0.3, "OWASP_AI": 0.3}

    # For static weights, we usually take the max risk found
    return max(cleaned.values()), cleaned