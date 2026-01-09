import time
import requests

class ModelExecutor:
    def __init__(self, config: dict):
        self.provider = config.get("provider")
        self.model = config.get("model")
        self.api_key = config.get("api_key")
        self.base_url = config.get("base_url")

    def execute_active_prompt(self, prompt: str) -> dict:
        start = time.time()

        if self.provider == "openai":
            response = self._openai(prompt)

        elif self.provider == "anthropic":
            response = self._anthropic(prompt)

        elif self.provider == "local":
            response = self._local_llm(prompt)

        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

        latency = time.time() - start

        return {
            "raw_response": response,
            "latency": latency,
        }

    # =========================
    # PROVIDER IMPLEMENTATIONS
    # =========================

    def _openai(self, prompt: str) -> str:
        from openai import OpenAI

        client = OpenAI(api_key=self.api_key)

        r = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
        )
        return r.choices[0].message.content

    def _anthropic(self, prompt: str) -> str:
        import anthropic

        client = anthropic.Anthropic(api_key=self.api_key)

        r = client.messages.create(
            model=self.model,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return r.content[0].text

    def _local_llm(self, prompt: str) -> str:
        r = requests.post(
            f"{self.base_url}/api/generate",
            json={"model": self.model, "prompt": prompt},
            timeout=60,
        )
        return r.json()["response"]
