from dataclasses import dataclass
from typing import Optional

@dataclass
class MetricResult:
    metric: str
    score: float
    severity: str
    explanation: str

class BaseMetric:
    def evaluate(
        self,
        prompt: str,
        response: str,
        metadata: dict | None = None,
    ) -> Optional[MetricResult]:
        raise NotImplementedError
