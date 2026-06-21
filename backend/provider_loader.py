from pathlib import Path
from typing import Dict, Any, Optional

try:
    import tomllib
except ImportError:
    pass

CURR_DIR = Path(__file__).parent.parent.resolve()
CONFIG_DIR = CURR_DIR / "config"
PROVIDERS_DIR = CONFIG_DIR / "providers"


def _deep_merge(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively merge dict2 into dict1. Child keys (dict2) override parent keys (dict1).
    Returns a new dictionary.
    """
    result = dict(dict1)
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _resolve_templates(config: Any, auth_context: Dict[str, Any], inputs_context: Dict[str, Any], runtime_context: Dict[str, Any], extra_contexts: Optional[Dict[str, Dict[str, Any]]] = None) -> Any:
    """
    Recursively resolves {{auth.X}}, {{inputs.X}}, {{runtime.X}}, and {{<section>.X}}
    templates in strings. Any top-level config section passed via extra_contexts becomes
    a resolvable namespace (e.g. {{modal_snaplova.url}}).
    This is exposed to be used at runtime (for inputs/runtime), but we also use it at load time
    to resolve auth and arbitrary config-section references.
    """
    extra = extra_contexts or {}
    if isinstance(config, dict):
        return {k: _resolve_templates(v, auth_context, inputs_context, runtime_context, extra) for k, v in config.items()}
    elif isinstance(config, list):
        return [_resolve_templates(item, auth_context, inputs_context, runtime_context, extra) for item in config]
    elif isinstance(config, str):
        result = config
        contexts = [("auth", auth_context), ("inputs", inputs_context), ("runtime", runtime_context)]
        contexts += [(name, ctx) for name, ctx in extra.items() if isinstance(ctx, dict)]
        # Iterate to a fixpoint so chained references resolve
        # (e.g. {{auth.modal_key}} -> {{modal_snaplova.modal_key}} -> actual value).
        # Contexts are snapshots that don't self-update mid-loop, so a single pass can
        # leave chained refs half-resolved when an earlier namespace is processed first.
        for _ in range(5):
            prev = result
            for ctx_name, ctx in contexts:
                for k, v in ctx.items():
                    target = f"{{{{{ctx_name}.{k}}}}}"
                    if target in result:
                        result = result.replace(target, str(v) if v is not None else "")
            if prev == result:
                break
        return result
    return config


def load_raw_toml(filepath: Path) -> Dict[str, Any]:
    with open(filepath, "rb") as f:
        return tomllib.load(f)


def _resolve_extends(config: Dict[str, Any], config_dir: Path, loaded: set) -> Dict[str, Any]:
    """Deep-merge parent configs declared via `extends`. Each parent path is
    resolved relative to config_dir; a parent's own extends resolve relative to
    that parent's directory."""
    if "extends" not in config:
        return config
    extends_val = config["extends"]
    parents = [extends_val] if isinstance(extends_val, str) else list(extends_val)
    merged_parent: Dict[str, Any] = {}
    for parent_name in parents:
        parent_path = (config_dir / parent_name).resolve()
        key = str(parent_path)
        if key in loaded:
            raise ValueError(f"Circular dependency detected extending {parent_name}")
        if not parent_path.exists():
            raise FileNotFoundError(f"Extended config not found: {parent_name} (resolved {parent_path})")
        parent_raw = load_raw_toml(parent_path)
        branch_loaded = set(loaded)
        branch_loaded.add(key)
        parent_merged = _resolve_extends(parent_raw, parent_path.parent, branch_loaded)
        merged_parent = _deep_merge(merged_parent, parent_merged)
    merged = _deep_merge(merged_parent, config)
    merged.pop("extends", None)
    return merged


def _resolve_loadtime_templates(config: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve {{auth.X}} and {{<section>.X}} templates. inputs/runtime are
    excluded here so {{inputs.X}} / {{runtime.X}} survive for per-request
    runtime resolution against real values."""
    auth_context = dict(config.get("auth", {}))
    extra_contexts = {k: v for k, v in config.items() if isinstance(v, dict) and k not in ("inputs", "runtime")}
    return _resolve_templates(config, auth_context, {}, {}, extra_contexts=extra_contexts)


def resolve_config(filename: str) -> Dict[str, Any]:
    """Loads a file-based provider config from config/providers/ and resolves
    `extends` and load-time templates."""
    filepath = PROVIDERS_DIR / filename
    if not filepath.exists():
        raise FileNotFoundError(f"Provider config not found: {filename}")
    config = load_raw_toml(filepath)
    config = _resolve_extends(config, PROVIDERS_DIR, set())
    return _resolve_loadtime_templates(config)


def _resolve_entry(name: str, body: Dict[str, Any], config_dir: Path) -> Dict[str, Any]:
    """Resolve a `type = "entry"` section into a provider config."""
    body = dict(body)
    kind = body.pop("kind", None)
    body.pop("type", None)       # the "entry" marker
    body.pop("enabled", None)    # already gated by the caller

    # Flat `url` at the entry root maps into [auth].url (where HttpEngine reads it).
    if "url" in body:
        auth = body.get("auth")
        auth = dict(auth) if isinstance(auth, dict) else {}
        auth["url"] = body.pop("url")
        body["auth"] = auth

    config = _resolve_extends(body, config_dir, set())
    if kind:
        config["type"] = kind
    return _resolve_loadtime_templates(config)


def _load_entries(config_dir: Path) -> Dict[str, Dict[str, Any]]:
    """Scan config_dir/config.toml for top-level `[section]` tables marked
    `type = "entry"` and resolve each into a provider config."""
    config_path = config_dir / "config.toml"
    if not config_path.exists():
        return {}
    raw = load_raw_toml(config_path)
    entries: Dict[str, Dict[str, Any]] = {}
    for name, body in raw.items():
        if isinstance(body, dict) and body.get("type") == "entry":
            if body.get("enabled", True) is False:
                continue
            try:
                entries[name] = _resolve_entry(name, body, config_dir)
            except Exception as e:
                print(f"[ProviderLoader] Failed to load entry '{name}': {e}")
    return entries


def load_all_providers() -> Dict[str, Dict[str, Any]]:
    """Loads all selectable providers: file-based (config/providers/*.toml,
    ignoring _* base files) plus `type = "entry"` sections from config.toml."""
    providers: Dict[str, Dict[str, Any]] = {}

    if PROVIDERS_DIR.exists():
        for filepath in PROVIDERS_DIR.glob("*.toml"):
            if filepath.name.startswith("_") or filepath.name.endswith(".example.toml"):
                continue
            try:
                providers[filepath.stem] = resolve_config(filepath.name)
            except Exception as e:
                print(f"[ProviderLoader] Failed to load {filepath.name}: {e}")

    providers.update(_load_entries(CONFIG_DIR))
    return providers

# We will implement get_generation_providers, etc. once GenericProvider is defined.
