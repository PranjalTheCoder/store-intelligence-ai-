import time
import uuid
import json
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("api_json_logger")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter('%(message)s'))
    logger.addHandler(ch)

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("X-Trace-ID", str(uuid.uuid4()))
        start_time = time.time()
        
        # Read request body to scan for event totals during ingest events
        event_count = None
        if request.url.path == "/events/ingest" and request.method == "POST":
            try:
                body = await request.json()
                if isinstance(body, dict) and "events" in body:
                    event_count = len(body["events"])
            except Exception:
                pass

        response: Response = await call_next(request)
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Parse store_id variables from routing attributes out of request paths
        store_id = request.path_params.get("store_id") or request.query_params.get("store_id")

        log_payload = {
            "trace_id": trace_id,
            "store_id": store_id,
            "endpoint": f"{request.method} {request.url.path}",
            "latency_ms": latency_ms,
            "event_count": event_count,
            "status_code": response.status_code
        }
        logger.info(json.dumps(log_payload))
        response.headers["X-Trace-ID"] = trace_id
        return response