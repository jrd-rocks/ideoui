import os
from pathlib import Path

CURR_DIR = Path(__file__).parent.parent.resolve()
CONFIG_DIR = CURR_DIR / "config"
CONFIG_PATH = CONFIG_DIR / "config.toml"


def load_config():
    if not CONFIG_PATH.exists():
        return {}

    try:
        import tomllib
        with open(CONFIG_PATH, "rb") as f:
            return tomllib.load(f)
    except Exception:
        config = {}
        current_section = None
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("[") and line.endswith("]"):
                    current_section = line[1:-1].strip()
                    config[current_section] = {}
                elif "=" in line and current_section:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    config[current_section][k] = v
        return config


def get_database_url():
    config = load_config()
    db_config = config.get("database", {})
    url = db_config.get("url") or os.environ.get("DATABASE_URL")
    if not url:
        raise ValueError("Database URL is not configured. Set [database].url in ui/config/config.toml or DATABASE_URL.")
    return url


def get_r2_config():
    config = load_config()
    r2_config = config.get("r2", {})
    return {
        "account_id": r2_config.get("account_id") or os.environ.get("R2_ACCOUNT_ID") or "",
        "access_key_id": r2_config.get("access_key_id") or os.environ.get("R2_ACCESS_KEY_ID") or "",
        "secret_access_key": r2_config.get("secret_access_key") or os.environ.get("R2_SECRET_ACCESS_KEY") or "",
        "bucket_name": r2_config.get("bucket_name") or os.environ.get("R2_BUCKET_NAME") or "",
        "public_url": r2_config.get("public_url") or os.environ.get("R2_PUBLIC_URL") or "",
    }


def get_inference_endpoints():
    config = load_config()
    endpoints = config.get("inference", [])
    if not isinstance(endpoints, list):
        endpoints = []

    has_default = any(ep.get("default") for ep in endpoints)
    for idx, ep in enumerate(endpoints):
        if "default" not in ep:
            ep["default"] = not has_default and idx == 0
        if "name" not in ep:
            ep["name"] = f"endpoint_{idx}"
        if "type" not in ep:
            ep["type"] = "modal"
        try:
            ep["max_simultaneous"] = int(ep.get("max_simultaneous", 2))
        except (ValueError, TypeError):
            ep["max_simultaneous"] = 2
    return endpoints


def get_modal_url():
    endpoints = get_inference_endpoints()
    for ep in endpoints:
        if ep.get("default"):
            return ep.get("url")
    if endpoints:
        return endpoints[0].get("url")
    return None


def get_deepseek_config():
    config = load_config()
    ds = config.get("deepseek", {})
    try:
        max_sim = int(ds.get("max_simultaneous", 3))
    except (ValueError, TypeError):
        max_sim = 3
    thinking_raw = ds.get("thinking_enabled", True)
    if isinstance(thinking_raw, str):
        thinking_enabled = thinking_raw.strip().lower() not in ("0", "false", "no", "disabled", "off")
    else:
        thinking_enabled = bool(thinking_raw)
    stream_raw = ds.get("stream", True)
    if isinstance(stream_raw, str):
        stream = stream_raw.strip().lower() not in ("0", "false", "no", "disabled", "off")
    else:
        stream = bool(stream_raw)
    return {
        "api_key": ds.get("api_key") or os.environ.get("DEEPSEEK_API_KEY"),
        "model": ds.get("model", "deepseek-v4-pro"),
        "max_simultaneous": max_sim,
        "thinking_enabled": thinking_enabled,
        "reasoning_effort": ds.get("reasoning_effort", "high"),
        "stream": stream,
    }


def get_modal_max_simultaneous() -> int:
    endpoints = get_inference_endpoints()
    for ep in endpoints:
        if ep.get("default"):
            return ep.get("max_simultaneous", 2)
    if endpoints:
        return endpoints[0].get("max_simultaneous", 2)
    return 2