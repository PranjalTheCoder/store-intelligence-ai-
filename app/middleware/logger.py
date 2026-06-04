# app/middleware/logger.py - REPLACE ENTIRE FILE
import time
import json
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import re

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # 1. Trace ID generation or inheritance
        trace_id = request.headers.get("X-Trace-ID", str(uuid.uuid4()))
        
        # 2. Extract Event Count (Safe body inspection for /events/ingest)
        event_count = None
        if request.url.path == "/events/ingest" and request.method == "POST":
            # Read body without breaking the downstream request stream
            body_bytes = await request.body()
            if body_bytes:
                try:
                    payload = json.loads(body_bytes)
                    if isinstance(payload, list):
                        event_count = len(payload)
                    elif isinstance(payload, dict) and "events" in payload:
                         event_count = len(payload["events"])
                except Exception:
                    pass 
            
            # Reconstruct the request so the route can still read it
            async def receive():
                return {"type": "http.request", "body": body_bytes}
            request._receive = receive

        # 3. Extract Store ID from URL (e.g., /stores/{store_id}/metrics)
        store_id = None
        match = re.search(r'/stores/([^/]+)/', request.url.path)
        if match:
            store_id = match.group(1)
        elif request.query_params.get("store_id"):
             store_id = request.query_params.get("store_id")

        # 4. Process Request
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            raise e
        finally:
            latency_ms = int((time.time() - start_time) * 1000)
            
            # 5. Emit Strictly Formatted JSON Log
            log_data = {
                "trace_id": trace_id,
                "store_id": store_id,
                "endpoint": f"{request.method} {request.url.path}",
                "latency_ms": latency_ms,
                "event_count": event_count,
                "status_code": status_code
            }
            
            # Use standard print to stdout (Docker collects this automatically)
            print(json.dumps(log_data))

        # Pass Trace ID to client
        response.headers["X-Trace-ID"] = trace_id
        return response