import base64
import hashlib
import json
import pickle
import random
import time
from typing import Any, Callable, Dict, List, Optional

import requests

from backend.providers.base import BaseProvider
from backend.storage import upload_image
from backend.utils import clean_and_reorder_prompt_json


BASE_SIZES = {
    "1:1": (1024, 1024),
    "16:9": (1344, 768),
    "9:16": (768, 1344),
    "5:4": (1152, 896),
    "4:5": (896, 1152),
    "3:2": (1216, 832),
    "2:3": (832, 1216),
}


class ModalProvider(BaseProvider):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._active_response = None

    def cancel(self):
        resp = self._active_response
        if resp is not None:
            self._active_response = None
            try:
                resp.close()
            except Exception:
                pass

    def _split_modal_url(self) -> tuple[str, dict | None]:
        modal_url = self.config.get("url")
        if not modal_url:
            raise ValueError("Modal URL is not configured in ui/config/ui/config/config.toml.")

        proxies = None
        if "|" in modal_url:
            proxy_part, real_url = modal_url.split("|", 1)
            proxy_part = proxy_part.strip()
            modal_url = real_url.strip()

            requests_proxy = proxy_part
            if requests_proxy.startswith("socks://"):
                requests_proxy = requests_proxy.replace("socks://", "socks5h://", 1)
            elif requests_proxy.startswith("socks5://"):
                requests_proxy = requests_proxy.replace("socks5://", "socks5h://", 1)

            proxies = {"http": requests_proxy, "https": requests_proxy}
            print(f"[Modal Provider] Forwarding request via SOCKS proxy: {proxy_part}", flush=True)
        return modal_url, proxies

    def get_schema(self) -> Dict[str, Any]:
        return {
            "displayName": self.get_display_name(),
            "type": "generation",
            "default": bool(self.config.get("default")),
            "inputs": {
                "sampler_preset": {
                    "label": "Sampler Preset",
                    "type": "select",
                    "options": [
                        {"value": "V4_QUALITY_48", "label": "Quality (48 steps)"},
                        {"value": "V4_DEFAULT_20", "label": "Default (20 steps)"},
                        {"value": "V4_TURBO_12", "label": "Turbo (12 steps)"},
                        {"value": "custom", "label": "Custom Parameters"},
                    ],
                    "default": "V4_QUALITY_48",
                },
                "aspect_ratio": {
                    "label": "Aspect Ratio",
                    "type": "select",
                    "options": [
                        {"value": ratio, "label": f"{ratio} ({width} x {height})"}
                        for ratio, (width, height) in BASE_SIZES.items()
                    ],
                    "default": "1:1",
                },
                "scale": {
                    "label": "Resolution Scale",
                    "type": "select",
                    "options": [
                        {"value": "standard", "label": "Standard"},
                        {"value": "2k", "label": "2K (2x dimensions)"},
                        {"value": "4k", "label": "4K (4x dimensions)"},
                    ],
                    "default": "standard",
                },
                "steps": {
                    "label": "Steps",
                    "type": "number",
                    "min": 1,
                    "max": 150,
                    "default": 48,
                    "visible_when": {"sampler_preset": "custom"},
                },
                "guidance": {
                    "label": "Guidance Scale",
                    "type": "number",
                    "min": 1,
                    "max": 20,
                    "step": 0.5,
                    "default": 7,
                    "visible_when": {"sampler_preset": "custom"},
                },
                "image_count": {
                    "label": "Number of Images",
                    "type": "select",
                    "options": [{"value": value, "label": f"{value} Image{'s' if value != 1 else ''}"} for value in range(1, 5)],
                    "default": 4,
                },
                "seed": {"label": "Seed", "type": "number", "min": 0, "default": 0, "placeholder": "0 (random)"},
            },
            "layout": [
                [{"id": "sampler_preset", "col_span": 1}, {"id": "aspect_ratio", "col_span": 1}],
                [{"id": "scale", "col_span": 2}],
                [{"id": "steps", "col_span": 1}, {"id": "guidance", "col_span": 1}],
                [{"id": "image_count", "col_span": 1}, {"id": "seed", "col_span": 1}],
            ],
        }

    def normalize_parameters(self, ui_params: Dict[str, Any]) -> Dict[str, Any]:
        params = dict(ui_params or {})
        if params.get("size") and "aspect_ratio" not in params:
            try:
                width, height = (int(value) for value in str(params["size"]).split("x", 1))
            except (TypeError, ValueError):
                width, height = BASE_SIZES["1:1"]
        else:
            width, height = BASE_SIZES.get(params.get("aspect_ratio", "1:1"), BASE_SIZES["1:1"])
            multiplier = {"standard": 1, "2k": 2, "4k": 4}.get(params.get("scale", "standard"), 1)
            width *= multiplier
            height *= multiplier

        preset = params.get("sampler_preset") or params.get("preset") or "V4_QUALITY_48"
        seed = int(params.get("seed") or 0)
        return {
            "seed": seed,
            "width": width,
            "height": height,
            "num_images_per_prompt": int(params.get("image_count") or params.get("imageCount") or 1),
            "prompt_upsampling": False,
            "sampler_preset": preset,
            "n_steps": int(params.get("steps") or 48) if preset == "custom" else None,
            "guidance_scale": float(params.get("guidance")) if preset == "custom" and params.get("guidance") not in (None, "") else None,
        }

    def execute(self, prompt: str, ui_params: Dict[str, Any]):
        params = self.normalize_parameters(ui_params)
        prompt_hash = hashlib.sha256((prompt or "").encode("utf-8", errors="replace")).hexdigest()[:12]
        print(
            "[Modal Provider] Request "
            f"prompt_sha256={prompt_hash} "
            f"prompt_chars={len(prompt or '')} "
            f"ui_params={json.dumps(ui_params or {}, sort_keys=True, default=str)} "
            f"modal_params={json.dumps(params, sort_keys=True, default=str)}",
            flush=True,
        )
        return self.generate_and_upload_images(prompt, params)

    def execute_stream(self, prompt: str, ui_params: Dict[str, Any],
                       progress_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None):
        params = self.normalize_parameters(ui_params)
        prompt_hash = hashlib.sha256((prompt or "").encode("utf-8", errors="replace")).hexdigest()[:12]
        print(
            "[Modal Provider] Stream request "
            f"prompt_sha256={prompt_hash} "
            f"prompt_chars={len(prompt or '')} "
            f"modal_params={json.dumps(params, sort_keys=True, default=str)}",
            flush=True,
        )
        return self._stream_and_upload(prompt, params, progress_callback)

    def _get_proxy_auth_headers(self) -> Dict[str, str]:
        headers = {}
        key = self.config.get("proxy_auth_key")
        secret = self.config.get("proxy_auth_secret")
        if key and secret:
            headers["Modal-Key"] = key
            headers["Modal-Secret"] = secret
        return headers

    def generate_and_upload_images(self, prompt: str, params: Dict[str, Any]) -> List[str]:
        modal_url, proxies = self._split_modal_url()
        headers = self._get_proxy_auth_headers()
        request_params = {
            "prompt": clean_and_reorder_prompt_json(prompt),
            "seed": params["seed"],
            "width": params["width"],
            "height": params["height"],
            "num_images_per_prompt": params["num_images_per_prompt"],
            "prompt_upsampling": str(params["prompt_upsampling"]).lower(),
            "sampler_preset": params["sampler_preset"],
        }
        if params.get("n_steps") is not None:
            request_params["n_steps"] = params["n_steps"]
        if params.get("guidance_scale") is not None:
            request_params["guidance_scale"] = params["guidance_scale"]

        print(f"[Modal Provider] Forwarding generation request to Modal URL: {modal_url}", flush=True)
        response = requests.get(modal_url, params=request_params, headers=headers, proxies=proxies, timeout=600)
        response.raise_for_status()

        try:
            image_bytes_list = pickle.loads(response.content)
        except Exception as exc:
            raise ValueError(f"Failed to unpickle response: {exc}") from exc

        urls = []
        timestamp = int(time.time() * 1000)
        rand_id = random.randint(100000, 999999)
        for idx, img_bytes in enumerate(image_bytes_list):
            filename = f"generations/{timestamp}_{rand_id}_{idx}.png"
            print(f"[Modal Provider] Uploading image {idx + 1}/{len(image_bytes_list)} to R2: {filename}", flush=True)
            urls.append(upload_image(img_bytes, filename))
        return urls

    def _get_stream_url(self) -> str:
        url = self.config.get("url")
        if not url:
            raise ValueError("Modal URL is not configured.")
        if "|" in url:
            url = url.split("|", 1)[1].strip()
        return url

    def _stream_and_upload(self, prompt: str, params: Dict[str, Any],
                           progress_callback: Optional[Callable] = None) -> List[str]:
        modal_url = self._get_stream_url()
        proxies = None
        raw_url = self.config.get("url", "")
        if "|" in raw_url:
            proxy_part = raw_url.split("|", 1)[0].strip()
            requests_proxy = proxy_part
            if requests_proxy.startswith("socks://"):
                requests_proxy = requests_proxy.replace("socks://", "socks5h://", 1)
            elif requests_proxy.startswith("socks5://"):
                requests_proxy = requests_proxy.replace("socks5://", "socks5h://", 1)
            proxies = {"http": requests_proxy, "https": requests_proxy}

        headers = self._get_proxy_auth_headers()
        request_params = {
            "prompt": clean_and_reorder_prompt_json(prompt),
            "seed": params["seed"],
            "width": params["width"],
            "height": params["height"],
            "num_images_per_prompt": params["num_images_per_prompt"],
            "prompt_upsampling": str(params["prompt_upsampling"]).lower(),
            "sampler_preset": params["sampler_preset"],
        }
        if params.get("n_steps") is not None:
            request_params["n_steps"] = params["n_steps"]
        if params.get("guidance_scale") is not None:
            request_params["guidance_scale"] = params["guidance_scale"]

        print(f"[Modal Provider] Streaming from: {modal_url}", flush=True)
        self._active_response = requests.get(
            modal_url, params=request_params, headers=headers,
            proxies=proxies, timeout=600, stream=True,
        )
        self._active_response.raise_for_status()
        response = self._active_response

        image_bytes_list = None
        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            payload = json.loads(line[6:])
            event_type = payload.get("type")

            if event_type == "status" and progress_callback:
                progress_callback("status", payload)
            elif event_type == "step" and progress_callback:
                progress_callback("step", payload)
            elif event_type == "complete":
                encoded_images = payload.get("images", [])
                image_bytes_list = [base64.b64decode(b) for b in encoded_images]
            elif event_type == "error":
                raise ValueError(payload.get("message", "Unknown Modal error"))

        if image_bytes_list is None:
            raise ValueError("Stream ended without complete event")

        urls = []
        timestamp = int(time.time() * 1000)
        rand_id = random.randint(100000, 999999)
        for idx, img_bytes in enumerate(image_bytes_list):
            filename = f"generations/{timestamp}_{rand_id}_{idx}.png"
            print(f"[Modal Provider] Uploading image {idx + 1}/{len(image_bytes_list)} to R2: {filename}", flush=True)
            urls.append(upload_image(img_bytes, filename))
        return urls
