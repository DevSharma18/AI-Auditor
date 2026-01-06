import os
import time
import requests

class ModelExecutor:
    def __init__(self, config: dict):
        self.endpoint = config["endpoint"]
        self.method = config.get("method", "POST")

        # Copy headers
        headers = dict(config.get("headers", {}))

        # 🔑 Resolve OpenAI API key
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not found in environment")

        # Replace placeholder OR override Authorization
        headers["Authorization"] = f"Bearer {api_key}"
        headers.setdefault("Content-Type", "application/json")

        self.headers = headers
        self.request_template = config.get("request_template", {})
        self.timeout_seconds = config.get("timeout_seconds", 30)
        self.session = requests.Session()

    def execute_active_prompt(self, prompt: str):
        payload = dict(self.request_template)
        payload["messages"] = [
            {"role": "user", "content": prompt}
        ]

        start = time.time()
        response = self.session.request(
            method=self.method,
            url=self.endpoint,
            headers=self.headers,
            json=payload,
            timeout=self.timeout_seconds,
        )
        latency = time.time() - start

        response.raise_for_status()

        return {
            "raw_response": response.json(),
            "latency": latency,
        }
