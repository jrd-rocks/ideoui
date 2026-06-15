from typing import Dict, Optional
from backend.provider_loader import load_all_providers
from backend.providers.generic_provider import GenericProvider

def get_generation_providers() -> Dict[str, GenericProvider]:
    providers = load_all_providers()
    return {k: GenericProvider(k, v) for k, v in providers.items() if v.get("type") == "diffusion"}

def get_upsampler_providers() -> Dict[str, GenericProvider]:
    providers = load_all_providers()
    return {k: GenericProvider(k, v) for k, v in providers.items() if v.get("type") == "llm"}

def get_chat_providers() -> Dict[str, GenericProvider]:
    providers = load_all_providers()
    return {k: GenericProvider(k, v) for k, v in providers.items() if v.get("type") == "llm" and v.get("allow_chat", False)}

def get_default_upsampler_id() -> Optional[str]:
    providers = load_all_providers()
    for pid, cfg in providers.items():
        if cfg.get("type") == "llm" and cfg.get("default"):
            return pid
    for pid, cfg in providers.items():
        if cfg.get("type") == "llm":
            return pid
    return None

def get_provider_schemas():
    schemas = {}
    for provider_id, provider in get_generation_providers().items():
        schemas[provider_id] = provider.get_schema()
    for provider_id, provider in get_upsampler_providers().items():
        schemas[provider_id] = provider.get_schema()
    return schemas
