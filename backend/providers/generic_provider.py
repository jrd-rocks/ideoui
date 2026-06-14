from typing import Any, Callable, Dict, List, Optional
from backend.providers.base import BaseProvider
from backend.providers.engines import ENGINES

class GenericProvider(BaseProvider):
    def __init__(self, provider_id: str, config: Dict[str, Any]):
        super().__init__(provider_id, config)
        engine_name = self.config.get("engine")
        if engine_name not in ENGINES:
            raise ValueError(f"Unknown engine '{engine_name}' for provider '{provider_id}'")
        self.engine = ENGINES[engine_name]()

    def get_schema(self) -> Dict[str, Any]:
        t = self.config.get("type", "generation")
        if t == "diffusion":
            t = "generation"
        elif t == "llm":
            t = "upsampler"

        raw_inputs = self.config.get("inputs", {})
        inputs = {}
        sizes = self.config.get("sizes", {})
        for key, info in raw_inputs.items():
            if info.get("type") == "aspect_ratio":
                options = []
                for ratio, dims in sizes.items():
                    if isinstance(dims, (list, tuple)) and len(dims) == 2:
                        w, h = dims
                        label = f"{ratio} ({w} x {h})"
                    else:
                        label = ratio
                    options.append({"value": ratio, "label": label})
                inputs[key] = {
                    **info,
                    "type": "select",
                    "options": options
                }
            else:
                inputs[key] = info

        return {
            "displayName": self.get_display_name(),
            "abbreviation": self.config.get("abbreviation"),
            "fullname": self.config.get("fullname", self.get_display_name()),
            "type": t,
            "engine": self.config.get("engine"),
            "default": bool(self.config.get("default", False)),
            "inputs": inputs,
            "layout": self.config.get("layout", []),
        }

    def normalize_parameters(self, ui_params: Dict[str, Any]) -> Dict[str, Any]:
        params = dict(ui_params or {})
        normalized = {}

        # Pull defaults from schema
        inputs = self.config.get("inputs", {})
        for key, schema in inputs.items():
            val = params.get(key)
            if val is None:
                val = schema.get("default")

            if schema.get("type") == "number":
                try:
                    val = float(val) if "." in str(val) else int(val)
                except (ValueError, TypeError):
                    pass
            normalized[key] = val

        # Filter out parameters whose visible_when conditions are not met
        for key, schema in inputs.items():
            visible_when = schema.get("visible_when")
            if visible_when:
                condition_met = True
                for dep_key, expected_val in visible_when.items():
                    if normalized.get(dep_key) != expected_val:
                        condition_met = False
                        break
                if not condition_met:
                    normalized[key] = None

        # Handle special types like aspect_ratio resolution to width/height
        for key, schema in inputs.items():
            if schema.get("type") == "aspect_ratio":
                ratio = normalized.get(key)
                sizes = self.config.get("sizes", {})
                if ratio in sizes:
                    w, h = sizes[ratio]
                    normalized["width"] = w
                    normalized["height"] = h

        # Apply scale multiplier if 'scale' is present
        if "scale" in normalized and "width" in normalized and "height" in normalized:
            multiplier = {"standard": 1, "2k": 2, "4k": 4}.get(normalized["scale"], 1)
            normalized["width"] *= multiplier
            normalized["height"] *= multiplier

        # Add magic parameters passed by job runner
        for k, v in params.items():
            if k.startswith("_"):
                normalized[k] = v

        return normalized

    # Diffusion interface
    def execute(self, prompt: str, ui_params: Dict[str, Any]) -> List[str]:
        if not hasattr(self.engine, "execute"):
            raise NotImplementedError(f"Engine {self.config.get('engine')} does not support execute")
        params = self.normalize_parameters(ui_params)
        return self.engine.execute(self.config, prompt, params)

    def execute_stream(self, prompt: str, ui_params: Dict[str, Any], progress_callback: Optional[Callable] = None) -> List[str]:
        if not hasattr(self.engine, "execute_stream"):
            raise NotImplementedError(f"Engine {self.config.get('engine')} does not support execute_stream")
        params = self.normalize_parameters(ui_params)
        return self.engine.execute_stream(self.config, prompt, params, progress_callback)

    # LLM interface
    def query(self, messages: List[Dict[str, str]], stream_callback: Optional[Callable] = None) -> Dict[str, Any]:
        if not hasattr(self.engine, "query"):
            raise NotImplementedError(f"Engine {self.config.get('engine')} does not support query")
        return self.engine.query(self.config, messages, stream_callback)

    def upsample_prompt(self, raw_prompt: str, aspect_ratio: str, ui_params: Dict[str, Any], stream_callback: Optional[Callable] = None) -> Dict[str, Any]:
        if not hasattr(self.engine, "upsample_prompt"):
            raise NotImplementedError(f"Engine {self.config.get('engine')} does not support upsample_prompt")
        params = self.normalize_parameters(ui_params)
        return self.engine.upsample_prompt(self.config, raw_prompt, aspect_ratio, params, stream_callback)

    def describe_json(self, json_prompt: str) -> str:
        if not hasattr(self.engine, "describe_json"):
            raise NotImplementedError(f"Engine {self.config.get('engine')} does not support describe_json")
        return self.engine.describe_json(self.config, json_prompt)

    def cancel(self):
        if hasattr(self.engine, "cancel"):
            self.engine.cancel()
