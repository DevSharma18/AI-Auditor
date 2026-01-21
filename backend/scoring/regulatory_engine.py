from __future__ import annotations

from typing import Dict, Tuple

from .normalization import clamp01
from .regulations import REGULATORY_WEIGHTS


def compute_regulatory_weight(metric_name: str) -> Tuple[float, Dict[str, float]]:
    """
    Returns:
    - R in [0..1] using max across frameworks
    - framework breakdown dict

    Example:
      R = max(GDPR, EUAI, OWASP_AI)
    """

    m = (metric_name or "").strip().lower()

    breakdown = REGULATORY_WEIGHTS.get(m, {}) or {}
    cleaned: Dict[str, float] = {}

    for k, v in breakdown.items():
        try:
            cleaned[str(k)] = clamp01(float(v))
        except Exception:
            cleaned[str(k)] = 0.0

    if not cleaned:
        # Unknown metric - treat as weak regulatory mapping
        return 0.3, {"GDPR": 0.3, "EUAI": 0.3, "OWASP_AI": 0.3}

    return max(cleaned.values()), cleaned
