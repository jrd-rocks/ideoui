import json
from typing import Any, Callable, Dict, List, Optional

import requests

from backend.config import get_deepseek_config
from backend.prompts import load_template_prompts, list_templates
from backend.providers.base import BaseProvider
from backend.utils import clean_and_reorder_prompt_json, clean_json_in_text


class DeepSeekProvider(BaseProvider):
    def get_schema(self) -> Dict[str, Any]:
        templates = list_templates()
        return {
            "displayName": self.get_display_name(),
            "type": "upsampler",
            "inputs": {
                "template": {
                    "label": "Prompt Template",
                    "type": "select",
                    "options": [{"value": name, "label": name} for name in templates],
                    "default": templates[0] if templates else "v1",
                }
            },
            "layout": [[{"id": "template", "col_span": 2}]],
        }

    def normalize_parameters(self, ui_params: Dict[str, Any]) -> Dict[str, Any]:
        params = dict(ui_params or {})
        return {"template": params.get("template") or params.get("upsampleTemplate") or "v1"}

    def get_display_name(self) -> str:
        cfg = get_deepseek_config()
        model = cfg.get("model")
        base = super().get_display_name()
        return f"{base} ({model})" if model else base

    def _payload(self, messages: List[Dict[str, str]], stream: bool) -> Dict[str, Any]:
        cfg = get_deepseek_config()
        model = cfg.get("model", "deepseek-v4-pro")
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "reasoning_effort": cfg.get("reasoning_effort", "high"),
            "thinking": {"type": "enabled" if cfg.get("thinking_enabled", True) else "disabled"},
        }
        return payload

    def query(self, messages: List[Dict[str, str]], stream_callback: Optional[Callable[[str, str], None]] = None) -> Dict[str, Any]:
        cfg = get_deepseek_config()
        api_key = cfg.get("api_key")
        if not api_key:
            raise ValueError("DeepSeek API key is not configured in ui/config/ui/config/config.toml.")
        if stream_callback and cfg.get("stream", True):
            return self.query_stream(messages, stream_callback)

        payload = self._payload(messages, stream=False)
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        response = requests.post("https://api.deepseek.com/chat/completions", json=payload, headers=headers, timeout=120)
        response.raise_for_status()
        data = response.json()
        if "choices" in data:
            for choice in data["choices"]:
                message = choice.get("message") or {}
                if "content" in message:
                    message["content"] = clean_json_in_text(message["content"])
        return data

    def query_stream(self, messages: List[Dict[str, str]], stream_callback: Callable[[str, str], None]) -> Dict[str, Any]:
        cfg = get_deepseek_config()
        api_key = cfg.get("api_key")
        if not api_key:
            raise ValueError("DeepSeek API key is not configured in ui/config/ui/config/config.toml.")

        payload = self._payload(messages, stream=True)
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        print(f"[DeepSeek Stream] Opening stream model={payload['model']} thinking={payload['thinking']['type']} reasoning_effort={payload['reasoning_effort']}", flush=True)

        content_parts: list[str] = []
        reasoning_parts: list[str] = []
        chunk_count = 0
        reasoning_count = 0
        content_count = 0
        with requests.post("https://api.deepseek.com/chat/completions", json=payload, headers=headers, timeout=180, stream=True) as response:
            response.raise_for_status()
            for raw_line in response.iter_lines(decode_unicode=True):
                if not raw_line:
                    continue
                line = raw_line.strip()
                if line.startswith("data:"):
                    line = line[5:].strip()
                if line == "[DONE]":
                    break
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    print(f"[DeepSeek Stream] Skipping non-JSON SSE line: {line[:120]}", flush=True)
                    continue
                chunk_count += 1
                for choice in event.get("choices", []):
                    delta = choice.get("delta") or {}
                    reasoning = delta.get("reasoning_content") or delta.get("reasoning") or ""
                    content = delta.get("content") or ""
                    if reasoning:
                        reasoning_parts.append(reasoning)
                        reasoning_count += 1
                        print(f"[DeepSeek Stream] reasoning chunk {reasoning_count}: {len(reasoning)} chars", flush=True)
                        stream_callback("thinking", reasoning)
                    if content:
                        content_parts.append(content)
                        content_count += 1
                        print(f"[DeepSeek Stream] content chunk {content_count}: {len(content)} chars", flush=True)
                        stream_callback("content", content)

        content = clean_json_in_text("".join(content_parts))
        print(
            f"[DeepSeek Stream] Completed stream chunks={chunk_count} reasoning_chunks={reasoning_count} content_chunks={content_count} content_chars={len(content)}",
            flush=True,
        )
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

    def upsample_prompt(self, raw_prompt: str, aspect_ratio: str, ui_params: Dict[str, Any], stream_callback: Optional[Callable[[str, str], None]] = None) -> Dict[str, Any]:
        params = self.normalize_parameters(ui_params)
        templates = load_template_prompts(params["template"])
        user_content = templates["user"].replace("{{aspect_ratio}}", aspect_ratio)
        user_content = user_content.replace("{{original_prompt}}", raw_prompt)
        messages = [{"role": "system", "content": templates["system"]}, {"role": "user", "content": user_content}]
        data = self.query(messages, stream_callback=stream_callback)
        content = data["choices"][0]["message"]["content"].strip()
        return {"content": clean_and_reorder_prompt_json(content), "messages": messages}

    def describe_json(self, json_prompt: str) -> str:
        messages = [
            {
                "role": "system",
                "content": "Write a short, concise, single-sentence human-style description of the image described by the JSON. Return only the description.",
            },
            {"role": "user", "content": f"Here is the JSON prompt:\n{json_prompt}"},
        ]
        data = self.query(messages)
        description = data["choices"][0]["message"]["content"].strip()
        if description.startswith('"') and description.endswith('"'):
            description = description[1:-1]
        return description
