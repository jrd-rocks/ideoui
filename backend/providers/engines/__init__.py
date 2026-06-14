from backend.providers.engines.http_engine import HttpEngine
from backend.providers.engines.chat_engine import ChatEngine

ENGINES = {
    "http": HttpEngine,
    "chat": ChatEngine,
}
