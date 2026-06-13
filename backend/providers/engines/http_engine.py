import base64
import json
import pickle
import random
import time
from typing import Any, Callable, Dict, List, Optional

import requests

from backend.storage import upload_image
from backend.utils import clean_and_reorder_prompt_json
from backend.provider_loader import _resolve_templates

class HttpEngine:
    def __init__(self):
        self._active_response = None

    def cancel(self):
        resp = self._active_response
        if resp is not None:
            self._active_response = None
            try:
                resp.close()
            except Exception:
                pass

    def _build_request_args(self, config: Dict[str, Any], runtime_context: Dict[str, Any], inputs_context: Dict[str, Any]) -> tuple[str, str, Dict[str, Any], Dict[str, str], Optional[Dict[str, str]]]:
        auth_context = config.get("auth", {})
        
        # Resolve URLs and paths
        req_cfg = config.get("request", {})
        method = req_cfg.get("method", "GET")
        url = auth_context.get("url") or req_cfg.get("base_url", "")
        if "path" in req_cfg:
            url = url.rstrip("/") + "/" + req_cfg["path"].lstrip("/")
            
        proxies = None
        if "|" in url:
            proxy_part, real_url = url.split("|", 1)
            proxy_part = proxy_part.strip()
            url = real_url.strip()

            requests_proxy = proxy_part
            if requests_proxy.startswith("socks://"):
                requests_proxy = requests_proxy.replace("socks://", "socks5h://", 1)
            elif requests_proxy.startswith("socks5://"):
                requests_proxy = requests_proxy.replace("socks5://", "socks5h://", 1)
            proxies = {"http": requests_proxy, "https": requests_proxy}

        # Resolve headers
        headers = {}
        if "headers" in auth_context:
            for k, v in auth_context["headers"].items():
                headers[k] = _resolve_templates(v, auth_context, inputs_context, runtime_context)
                
        # Resolve payload
        payload = {}
        for k, template in req_cfg.get("fields", {}).items():
            payload[k] = _resolve_templates(template, auth_context, inputs_context, runtime_context)
            
        for k, template in req_cfg.get("optional_fields", {}).items():
            val = _resolve_templates(template, auth_context, inputs_context, runtime_context)
            if val is not None and val != "":
                payload[k] = val

        # Clean JSON prompt strings for Ideogram if needed
        for k in ["prompt", "text_prompt"]:
            if k in payload and isinstance(payload[k], str) and payload[k].strip().startswith("{"):
                payload[k] = clean_and_reorder_prompt_json(payload[k])

        # Type conversion (bool strings -> bools) if the API expects it...
        # Wait, the prompt_upsampling is sent as a string "true"/"false" in the old ModalProvider
        if "prompt_upsampling" in payload and isinstance(payload["prompt_upsampling"], str):
            payload["prompt_upsampling"] = payload["prompt_upsampling"].lower()

        kwargs = {"timeout": req_cfg.get("timeout", 600)}
        if req_cfg.get("format") == "json_body":
            kwargs["json"] = payload
        else:
            kwargs["params"] = payload
            
        if proxies:
            kwargs["proxies"] = proxies
            
        return method, url, headers, kwargs

    def execute(self, config: Dict[str, Any], prompt: str, params: Dict[str, Any]) -> List[str]:
        runtime_context = {"prompt": prompt, "raw_prompt": params.get("_source_raw_prompt", prompt)}
        method, url, headers, kwargs = self._build_request_args(config, runtime_context, params)
        
        proxies_log = f" via proxy {kwargs['proxies']}" if "proxies" in kwargs else ""
        print(f"[HttpEngine] Non-streaming request to: {url}{proxies_log}", flush=True)
        safe_headers = {k: ("***" if any(x in k.lower() for x in ["api", "auth", "secret", "token"]) else v) for k, v in headers.items()}
        print(f"[HttpEngine] Request Details:\n  Method: {method}\n  Headers: {safe_headers}\n  Payload: {kwargs.get('json') or kwargs.get('params')}", flush=True)
            
        response = requests.request(method, url, headers=headers, **kwargs)
        if config.get("logging", False):
            print(f"[HttpEngine] Response status={response.status_code} body_len={len(response.content)}", flush=True)
            if response.headers.get("Content-Type", "").startswith("application/json") or len(response.text) < 1000:
                print(f"[HttpEngine] Response text:\n{response.text}", flush=True)
        response.raise_for_status()
        
        resp_cfg = config.get("response", {})
        fmt = resp_cfg.get("format", "pickle")
        
        if fmt == "pickle":
            try:
                image_bytes_list = pickle.loads(response.content)
            except Exception as exc:
                raise ValueError(f"Failed to unpickle response: {exc}") from exc
        elif fmt == "json":
            data = response.json()
            field = resp_cfg.get("images_field", "")
            if field:
                # Simple dot-path extraction
                for p in field.split("."):
                    data = data.get(p, {})
            image_bytes_list = [base64.b64decode(item) for item in data]
        else:
            image_bytes_list = [response.content]

        return self._upload_images(image_bytes_list)

    def execute_stream(self, config: Dict[str, Any], prompt: str, params: Dict[str, Any], progress_callback: Optional[Callable] = None) -> List[str]:
        stream_cfg = config.get("streaming", {})
        if not stream_cfg.get("enabled", False):
            return self.execute(config, prompt, params)
            
        runtime_context = {"prompt": prompt, "raw_prompt": params.get("_source_raw_prompt", prompt)}
        method, url, headers, kwargs = self._build_request_args(config, runtime_context, params)
        kwargs["stream"] = True
        
        proxies_log = f" via proxy {kwargs['proxies']}" if "proxies" in kwargs else ""
        print(f"[HttpEngine] Streaming from: {url}{proxies_log}", flush=True)
        safe_headers = {k: ("***" if any(x in k.lower() for x in ["api", "auth", "secret", "token"]) else v) for k, v in headers.items()}
        print(f"[HttpEngine] Request Details:\n  Method: {method}\n  Headers: {safe_headers}\n  Payload: {kwargs.get('json') or kwargs.get('params')}", flush=True)
            
        self._active_response = requests.request(method, url, headers=headers, **kwargs)
        self._active_response.raise_for_status()
        
        prefix = stream_cfg.get("data_prefix", "data: ")
        type_field = stream_cfg.get("type_field", "type")
        events = stream_cfg.get("events", {})
        result_cfg = stream_cfg.get("result", {})
        error_cfg = stream_cfg.get("error", {})
        
        image_bytes_list = None
        for line in self._active_response.iter_lines(decode_unicode=True):
            if not line or not line.startswith(prefix):
                continue
            payload = json.loads(line[len(prefix):])
            if config.get("logging", False):
                print(f"[HttpEngine] Stream payload: {payload}", flush=True)
            
            event_type = payload.get(type_field)
            if event_type == events.get("status") and progress_callback:
                progress_callback("status", payload)
            elif event_type == events.get("step") and progress_callback:
                progress_callback("step", payload)
            elif event_type == events.get("complete"):
                # Extract
                data = payload
                for p in result_cfg.get("field", "images").split("."):
                    data = data.get(p, {})
                if result_cfg.get("encoding") == "base64":
                    image_bytes_list = [base64.b64decode(b) for b in data]
                else:
                    image_bytes_list = data # assuming list of bytes if not base64
            elif event_type == events.get("error"):
                raise ValueError(payload.get(error_cfg.get("field", "message"), "Unknown error"))

        if image_bytes_list is None:
            raise ValueError("Stream ended without complete event")

        return self._upload_images(image_bytes_list)
        
    def _upload_images(self, image_bytes_list: List[bytes]) -> List[str]:
        urls = []
        timestamp = int(time.time() * 1000)
        rand_id = random.randint(100000, 999999)
        for idx, img_bytes in enumerate(image_bytes_list):
            filename = f"generations/{timestamp}_{rand_id}_{idx}.png"
            print(f"[HttpEngine] Uploading image {idx + 1}/{len(image_bytes_list)} to R2: {filename}", flush=True)
            urls.append(upload_image(img_bytes, filename))
        return urls

    def upsample_prompt(self, config: Dict[str, Any], raw_prompt: str, aspect_ratio: str, params: Dict[str, Any], stream_callback: Optional[Callable] = None) -> Dict[str, Any]:
        # Specific for LLM providers backed by HTTP engine (e.g. Ideogram Magic)
        runtime_context = {"raw_prompt": raw_prompt, "prompt": raw_prompt}
        # Normalize aspect ratio from W:H format (e.g., "1:1") to WxH format (e.g., "1x1") for Ideogram API compatibility
        normalized_ar = aspect_ratio.replace(":", "x") if aspect_ratio else "AUTO"
        params["aspect_ratio"] = normalized_ar
        
        method, url, headers, kwargs = self._build_request_args(config, runtime_context, params)
        
        # Log the sent parameters (excluding API key values for security)
        if config.get("logging", False):
            safe_headers = {k: ("***" if any(x in k.lower() for x in ["api", "auth", "secret", "token"]) else v) for k, v in headers.items()}
            print(f"[HttpEngine] Sending upsample request:\n  URL: {url}\n  Method: {method}\n  Headers: {safe_headers}\n  Payload: {kwargs.get('json') or kwargs.get('params')}", flush=True)
        else:
            print(f"[HttpEngine] Upsample request to: {url}", flush=True)
        
        response = requests.request(method, url, headers=headers, **kwargs)
        if config.get("logging", False):
            print(f"[HttpEngine] Raw upsample response status={response.status_code}:\n{response.text}", flush=True)
        response.raise_for_status()
        
        data = response.json()
        resp_cfg = config.get("response", {})
        
        # Extract content
        content = data
        for p in resp_cfg.get("content_field", "json_prompt").split("."):
            content = content.get(p, {})
            
        # Serialize back to string if it's a dict (e.g. Ideogram V4JsonPrompt)
        if isinstance(content, dict):
            content = json.dumps(content)
            
        content = clean_and_reorder_prompt_json(content)
        
        # Extract aspect ratio
        resolved_ar = data
        for p in resp_cfg.get("aspect_ratio_field", "aspect_ratio").split("."):
            resolved_ar = resolved_ar.get(p, {})
            
        if isinstance(resolved_ar, dict):
            resolved_ar = aspect_ratio
            
        return {
            "content": content,
            "messages": [], # HTTP engine upsampling has no message history
            "aspect_ratio": resolved_ar
        }
