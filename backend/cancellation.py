import threading
from typing import Optional


class JobCancelled(Exception):
    """Raised inside a provider/engine call when the job's cancel token is set.

    Per-job cancellation is threaded through provider method calls (engines are
    singletons shared across all jobs, so a token must be passed per call).
    """


def new_cancel_token() -> threading.Event:
    return threading.Event()


def token_cancelled(token: Optional[threading.Event]) -> bool:
    return token is not None and token.is_set()
