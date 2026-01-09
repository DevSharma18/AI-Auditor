from .base import MetricResult

class PIIMetric:
    """
    Quantitative PII leakage scoring (stub for now)
    """

    def evaluate(self, prompt: str, response: str) -> MetricResult:
        return MetricResult(
            metric="pii",
            score=100.0,
            severity="LOW",
            explanation="PII metric not yet implemented",
        )
