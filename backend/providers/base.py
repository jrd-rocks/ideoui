from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class BaseProvider(ABC):
    def __init__(self, provider_id: str, config: Optional[Dict[str, Any]] = None):
        self.provider_id = provider_id
        self.config = config or {}

    @abstractmethod
    def get_schema(self) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def normalize_parameters(self, ui_params: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def get_display_name(self) -> str:
        return self.config.get("name") or self.provider_id
