import requests
from jsonpath_ng import parse
from copy import deepcopy

def deep_replace(obj, token, value):
    if isinstance(obj, dict):
        return {k: deep_replace(v, token, value) for k, v in obj.items()}
    if isinstance(obj, list):
        return [deep_replace(i, token, value) for i in obj]
    if isinstance(obj, str):
        return obj.replace(token, value)
    return obj


def execute_model(connector, prompt: str):
    payload = deepcopy(connector.request_template)
    payload = deep_replace(payload, "{{PROMPT}}", prompt)

    response = requests.request(
        method=connector.method,
        url=connector.endpoint,
        headers=connector.headers,
        json=payload,
        timeout=connector.timeout_seconds
    )

    data = response.json()

    if connector.response_path:
        expr = parse(connector.response_path)
        matches = expr.find(data)
        output = matches[0].value if matches else None
    else:
        output = data

    return {
        "status": response.status_code,
        "raw": data,
        "output": output
    }
