import asyncio
from typing import Dict, List
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Map poll_id to list of active WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, poll_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.setdefault(poll_id, []).append(websocket)

    async def disconnect(self, poll_id: int, websocket: WebSocket):
        async with self._lock:
            if poll_id in self.active_connections:
                try:
                    self.active_connections[poll_id].remove(websocket)
                except ValueError:
                    pass # Already removed
                if not self.active_connections[poll_id]:
                    del self.active_connections[poll_id]

    async def broadcast(self, poll_id: int, message: dict):
        # It's better not to hold the lock during network I/O.
        async with self._lock:
            connections = self.active_connections.get(poll_id, [])[:]
        
        
        # Use asyncio.gather to send messages concurrently for better performance.
        results = await asyncio.gather(
            *[connection.send_json(message) for connection in connections],
            return_exceptions=True
        )

        for connection, result in zip(connections, results):
            if isinstance(result, Exception):
                # An exception occurred, which likely means the client disconnected.
                # We can log unexpected errors for debugging.
                if not isinstance(result, RuntimeError):
                    logger.error(f"Error broadcasting to client: {result}", exc_info=True)
                await self.disconnect(poll_id, connection)

