import json
from typing import Any, Callable, Dict, List, Optional
import requests

from backend.prompts import load_template_prompts
from backend.utils import clean_and_reorder_prompt_json, clean_json_in_text
from backend.provider_loader import _resolve_templates

class ChatEngine:
    def __init__(self):
        pass

    def _build_request_args(self, config: Dict[str, Any], messages: List[Dict[str, str]], stream: bool) -> tuple[str, str, Dict[str, str], Dict[str, Any]]:
        auth_context = config.get("auth", {})
        req_cfg = config.get("request", {})
        model_cfg = config.get("model", {})

        method = req_cfg.get("method", "POST")
        url = req_cfg.get("base_url", "")
        if "path" in req_cfg:
            url = url.rstrip("/") + "/" + req_cfg["path"].lstrip("/")

        headers = {}
        if "headers" in auth_context:
            for k, v in auth_context["headers"].items():
                headers[k] = _resolve_templates(v, auth_context, {}, {})

        payload = {
            "model": model_cfg.get("name"),
            "messages": messages,
            "stream": stream,
        }

        extra = model_cfg.get("extra", {})
        for k, v in extra.items():
            payload[k] = v

        kwargs = {"timeout": req_cfg.get("timeout", 180), "json": payload}
        return method, url, headers, kwargs

    def query(self, config: Dict[str, Any], messages: List[Dict[str, str]], stream_callback: Optional[Callable] = None) -> Dict[str, Any]:
        stream_cfg = config.get("streaming", {})
        if stream_callback and stream_cfg.get("enabled", True):
            return self.query_stream(config, messages, stream_callback)

        method, url, headers, kwargs = self._build_request_args(config, messages, stream=False)
        if config.get("logging", False):
            safe_headers = {k: ("***" if any(x in k.lower() for x in ["api", "auth", "secret", "token"]) else v) for k, v in headers.items()}
            print(f"[ChatEngine] Query Request:\n  URL: {url}\n  Method: {method}\n  Headers: {safe_headers}\n  Payload: {kwargs.get('json')}", flush=True)
        else:
            print(f"[ChatEngine] Query request to: {url}", flush=True)

        response = requests.request(method, url, headers=headers, **kwargs)
        if config.get("logging", False):
            print(f"[ChatEngine] Query Response status={response.status_code}:\n{response.text}", flush=True)
        response.raise_for_status()

        data = response.json()
        if "choices" in data:
            for choice in data["choices"]:
                message = choice.get("message") or {}
                if "content" in message:
                    message["content"] = clean_json_in_text(message["content"])
        return data

    def query_stream(self, config: Dict[str, Any], messages: List[Dict[str, str]], stream_callback: Callable[[str, str], None]) -> Dict[str, Any]:
        method, url, headers, kwargs = self._build_request_args(config, messages, stream=True)
        kwargs["stream"] = True

        if config.get("logging", False):
            safe_headers = {k: ("***" if any(x in k.lower() for x in ["api", "auth", "secret", "token"]) else v) for k, v in headers.items()}
            print(f"[ChatEngine] Query Stream Request:\n  URL: {url}\n  Method: {method}\n  Headers: {safe_headers}\n  Payload: {kwargs.get('json')}", flush=True)
        else:
            print(f"[ChatEngine] Query stream request to: {url}", flush=True)

        stream_cfg = config.get("streaming", {})
        prefix = stream_cfg.get("data_prefix", "data:")
        done_signal = stream_cfg.get("done_signal", "[DONE]")
        delta_cfg = stream_cfg.get("delta", {})
        delta_path = delta_cfg.get("path", "choices[0].delta") # Simplified pathing for choices array
        content_field = delta_cfg.get("content_field", "content")
        reasoning_field = delta_cfg.get("reasoning_field", "reasoning_content")

        content_parts: list[str] = []
        reasoning_parts: list[str] = []

        with requests.request(method, url, headers=headers, **kwargs) as response:
            response.raise_for_status()
            for raw_line in response.iter_lines(decode_unicode=True):
                if not raw_line:
                    continue
                line = raw_line.strip()
                if line.startswith(prefix):
                    line = line[len(prefix):].strip()
                if done_signal and line == done_signal:
                    break
                try:
                    event = json.loads(line)
                    if config.get("logging", False):
                        print(f"[ChatEngine] Stream event payload: {event}", flush=True)
                except json.JSONDecodeError:
                    continue

                # Navigate to delta
                # Simple choices[].delta or choices[0].delta support
                deltas = []
                if "choices[].delta" in delta_path:
                    for choice in event.get("choices", []):
                        deltas.append(choice.get("delta", {}))
                elif "choices[0].delta" in delta_path:
                    choices = event.get("choices", [])
                    if choices:
                        deltas.append(choices[0].get("delta", {}))
                else:
                    # fallback to dot notation
                    node = event
                    for p in delta_path.split("."):
                        node = node.get(p, {})
                    deltas.append(node)

                for delta in deltas:
                    if not isinstance(delta, dict):
                        continue

                    reasoning = delta.get(reasoning_field, "")
                    content = delta.get(content_field, "")

                    if reasoning:
                        reasoning_parts.append(reasoning)
                        stream_callback("thinking", reasoning)
                    if content:
                        content_parts.append(content)
                        stream_callback("content", content)

        content = clean_json_in_text("".join(content_parts))
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": content,
                        "reasoning_content": "".join(reasoning_parts),
                    }
                }
            ]
        }

    def upsample_prompt(self, config: Dict[str, Any], raw_prompt: str, aspect_ratio: str, params: Dict[str, Any], stream_callback: Optional[Callable] = None) -> Dict[str, Any]:
        template_name = params.get("template", "v1")
        templates = load_template_prompts(template_name)
        user_content = templates["user"].replace("{{aspect_ratio}}", aspect_ratio)
        user_content = user_content.replace("{{original_prompt}}", raw_prompt)
        messages = [{"role": "system", "content": templates["system"]}, {"role": "user", "content": user_content}]
        data = self.query(config, messages, stream_callback=stream_callback)
        content = data["choices"][0]["message"]["content"].strip()
        return {"content": clean_and_reorder_prompt_json(content), "messages": messages}

    def describe_json(self, config: Dict[str, Any], json_prompt: str) -> str:
        messages = [
            {
                "role": "system",
                "content": "Write a short, concise, single-sentence human-style description of the image described by the JSON. Return only the description.",
            },
            {"role": "user", "content": f"Here is the JSON prompt:\n{json_prompt}"},
        ]
        data = self.query(config, messages)
        description = data["choices"][0]["message"]["content"].strip()
        if description.startswith('"') and description.endswith('"'):
            description = description[1:-1]
        return description
