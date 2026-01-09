from .base import MetricResult

class BiasMetric:
    """
    Quantitative bias scoring (stub for now)
    """

    def evaluate(self, prompt: str, response: str) -> MetricResult:
        return MetricResult(
            metric="bias",
            score=100.0,
            severity="LOW",
            explanation="Bias metric not yet implemented",
        )
