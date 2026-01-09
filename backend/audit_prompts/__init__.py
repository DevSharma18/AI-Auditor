from .hallucination import HALLUCINATION_PROMPTS
from .bias import BIAS_PROMPTS
from .pii import PII_PROMPTS
from .compliance import COMPLIANCE_PROMPTS
from .drift import DRIFT_PROMPTS

PROMPT_CATEGORIES = {
    "hallucination": HALLUCINATION_PROMPTS,
    "bias": BIAS_PROMPTS,
    "pii": PII_PROMPTS,
    "compliance": COMPLIANCE_PROMPTS,
    "drift": DRIFT_PROMPTS,
}
