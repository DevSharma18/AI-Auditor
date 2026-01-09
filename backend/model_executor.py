import time
import requests
import json
from typing import Dict, Any


class ModelExecutor:
    """
    Provider-agnostic executor.
    Executes exactly what connector config defines.
    """

    def __init__(self, config: Dict[str, Any]):
        self.endpoint = config.get("endpoint")
        self.method = config.get("method", "POST")
        self.headers_template = config.get("headers", {})
        self.request_template = config.get("request_template")
        self.response_path = config.get("response_path")

        if not self.endpoint or not self.request_template or not self.response_path:
            raise ValueError("Invalid execution contract")

    def execute_active_prompt(self, prompt: str) -> Dict[str, Any]:
        start = time.time()

        headers = {
            k: v.replace("{{PROMPT}}", prompt)
            for k, v in self.headers_template.items()
        }

        payload = json.loads(json.dumps(self.request_template))
        payload = self._inject_prompt(payload, prompt)

        print("EXECUTING REQUEST >>>", self.endpoint)
        print("PAYLOAD >>>", json.dumps(payload)[:500])

        response = requests.request(
            method=self.method,
            url=self.endpoint,
            headers=headers,
            json=payload,
            timeout=60,
        )

        latency = time.time() - start

        if response.status_code >= 400:
            raise RuntimeError(
                f"Model request failed: {response.status_code} {response.text}"
            )

        raw_json = response.json()
        content = self._extract_response(raw_json)

        return {
            "raw_response": raw_json,
            "content": content,
            "latency": latency,
        }

    def _inject_prompt(self, obj, prompt: str):
        if isinstance(obj, dict):
            return {k: self._inject_prompt(v, prompt) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self._inject_prompt(i, prompt) for i in obj]
        if isinstance(obj, str):
            return obj.replace("{{PROMPT}}", prompt)
        return obj

    def _extract_response(self, data: dict):
        current = data
        for part in self.response_path.replace("]", "").split("."):
            if "[" in part:
                key, index = part.split("[")
                current = current[key][int(index)]
            else:
                current = current[part]
        return current
