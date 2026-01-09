from .base import BaseMetric, MetricResult

class DriftMetric(BaseMetric):
    def evaluate(self, prompt, response, metadata=None):
        previous_score = metadata.get("previous_score")
        current_score = metadata.get("current_score")

        if previous_score is None:
            return None

        drift = abs(current_score - previous_score)

        return MetricResult(
            metric="drift",
            score=drift,
            severity="HIGH" if drift > 20 else "LOW",
            explanation=f"Drift detected: {drift}% deviation"
        )
