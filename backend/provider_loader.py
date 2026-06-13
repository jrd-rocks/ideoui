from pathlib import Path
from typing import Dict, Any

try:
    import tomllib
except ImportError:
    pass

CURR_DIR = Path(__file__).parent.parent.resolve()
PROVIDERS_DIR = CURR_DIR / "config" / "providers"


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


def _resolve_templates(config: Any, auth_context: Dict[str, Any], inputs_context: Dict[str, Any], runtime_context: Dict[str, Any]) -> Any:
    """
    Recursively resolves {{auth.X}}, {{inputs.X}}, and {{runtime.X}} templates in strings.
    This is exposed to be used at runtime (for inputs/runtime), but we also use it at load time
    just for {{auth.X}} resolution if auth_context is provided.
    """
    if isinstance(config, dict):
        return {k: _resolve_templates(v, auth_context, inputs_context, runtime_context) for k, v in config.items()}
    elif isinstance(config, list):
        return [_resolve_templates(item, auth_context, inputs_context, runtime_context) for item in config]
    elif isinstance(config, str):
        result = config
        # Simple string replacement for templates
        for ctx_name, ctx in [("auth", auth_context), ("inputs", inputs_context), ("runtime", runtime_context)]:
            for k, v in ctx.items():
                target = f"{{{{{ctx_name}.{k}}}}}"
                if target in result:
                    result = result.replace(target, str(v) if v is not None else "")
        return result
    return config


def load_raw_toml(filepath: Path) -> Dict[str, Any]:
    with open(filepath, "rb") as f:
        return tomllib.load(f)


def resolve_config(filename: str, loaded: set = None, is_top_level: bool = True) -> Dict[str, Any]:
    """Loads a config and resolves 'extends' recursively."""
    if loaded is None:
        loaded = set()
    
    filepath = PROVIDERS_DIR / filename
    if not filepath.exists():
        raise FileNotFoundError(f"Provider config not found: {filename}")
        
    config = load_raw_toml(filepath)
    
    if "extends" in config:
        extends_val = config["extends"]
        parents = [extends_val] if isinstance(extends_val, str) else extends_val
        
        merged_parent = {}
        for parent_file in parents:
            if parent_file in loaded:
                raise ValueError(f"Circular dependency detected in {filename} extending {parent_file}")
            
            branch_loaded = set(loaded)
            branch_loaded.add(parent_file)
            parent_config = resolve_config(parent_file, branch_loaded, is_top_level=False)
            merged_parent = _deep_merge(merged_parent, parent_config)
            
        # Merge child on top of parent
        merged = _deep_merge(merged_parent, config)
        merged.pop("extends", None)
        config = merged
        
    # Resolve {{auth.X}} templates using the merged [auth] section only at top-level
    if is_top_level and "auth" in config:
        # We pass the auth dict as the context for auth
        auth_context = dict(config["auth"])
        config = _resolve_templates(config, auth_context=auth_context, inputs_context={}, runtime_context={})
        
    return config


def load_all_providers() -> Dict[str, Dict[str, Any]]:
    """Loads all selectable providers (ignoring _* base files). Returns {id: config}."""
    if not PROVIDERS_DIR.exists():
        return {}
        
    providers = {}
    for filepath in PROVIDERS_DIR.glob("*.toml"):
        if filepath.name.startswith("_"):
            continue
        provider_id = filepath.stem
        try:
            providers[provider_id] = resolve_config(filepath.name)
        except Exception as e:
            print(f"[ProviderLoader] Failed to load {filepath.name}: {e}")
            
    return providers

# We will implement get_generation_providers, etc. once GenericProvider is defined.
