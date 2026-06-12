from typing import Dict

from backend.config import get_inference_endpoints
from backend.providers.deepseek_provider import DeepSeekProvider
from backend.providers.modal_provider import ModalProvider


def get_generation_providers() -> Dict[str, ModalProvider]:
    providers = {}
    for endpoint in get_inference_endpoints():
        provider_id = endpoint.get("name")
        if endpoint.get("type", "modal") == "modal" and provider_id:
            providers[provider_id] = ModalProvider(provider_id, endpoint)
    return providers


def get_upsampler_providers() -> Dict[str, DeepSeekProvider]:
    return {"deepseek": DeepSeekProvider("deepseek", {"name": "DeepSeek"})}


def get_provider_schemas():
    schemas = {}
    for provider_id, provider in get_generation_providers().items():
        schemas[provider_id] = provider.get_schema()
    for provider_id, provider in get_upsampler_providers().items():
        schemas[provider_id] = provider.get_schema()
    return schemas
