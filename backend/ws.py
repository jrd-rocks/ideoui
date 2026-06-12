import anyio
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.connections.discard(websocket)

    async def broadcast(self, payload: dict):
        stale = []
        for websocket in list(self.connections):
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)


ws_manager = WebSocketManager()


async def push_job(event_type: str, job: dict):
    await ws_manager.broadcast({"event_type": event_type, "job": job, **job})


def websocket_stream_callback(job_id: str, context: str):
    def emit(stream_type: str, token: str):
        emit.chunk_count += 1
        if stream_type == "thinking":
            emit.thinking_count += 1
        else:
            emit.content_count += 1
        print(f"[WebSocket Stream] Forwarding {stream_type} chunk job={job_id} context={context} chars={len(token)}", flush=True)
        anyio.from_thread.run(
            ws_manager.broadcast,
            {
                "event_type": "llm_stream",
                "job_id": job_id,
                "context": context,
                "stream_type": stream_type,
                "token": token,
                "done": False,
            },
        )

    emit.chunk_count = 0
    emit.thinking_count = 0
    emit.content_count = 0
    return emit


async def finish_websocket_stream(job_id: str, context: str, callback=None):
    if callback is not None:
        print(
            f"[WebSocket Stream] Stream complete job={job_id} context={context} forwarded_chunks={callback.chunk_count} thinking_chunks={callback.thinking_count} content_chunks={callback.content_count}",
            flush=True,
        )
    else:
        print(f"[WebSocket Stream] Stream complete job={job_id} context={context}", flush=True)
    await ws_manager.broadcast({
        "event_type": "llm_stream",
        "job_id": job_id,
        "context": context,
        "stream_type": "content",
        "token": "",
        "done": True,
    })


def push_generation_progress(job_id: str, event_type: str, data: dict):
    payload = {
        "event_type": "generation_progress",
        "job_id": job_id,
        "progress_event": event_type,
        **data,
    }
    anyio.from_thread.run(lambda: ws_manager.broadcast(payload))
