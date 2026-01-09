from .bias import BIAS_PROMPTS
from .pii import PII_PROMPTS
from .hallucination import HALLUCINATION_PROMPTS
from .drift import DRIFT_PROMPTS
from .compliance import COMPLIANCE_PROMPTS

PROMPT_LIBRARY_VERSION = "v1.0.0"

ACTIVE_AUDIT_PROMPTS = {
    "bias": BIAS_PROMPTS,
    "pii": PII_PROMPTS,
    "hallucination": HALLUCINATION_PROMPTS,
    "drift": DRIFT_PROMPTS,
    "compliance": COMPLIANCE_PROMPTS,
}
