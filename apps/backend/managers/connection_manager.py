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
            if poll_id not in self.active_connections:
                self.active_connections[poll_id] = []
            self.active_connections[poll_id].append(websocket)

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
        
        for connection in connections:
            try:
                await connection.send_json(message)
            except RuntimeError as e:
                # e.g. "RuntimeError: Unexpected ASGI message 'websocket.disconnect', while running 'websocket.send'"
                # We can log this but it's expected if client disconnected.
                # logger.info(f"Client disconnected during broadcast: {e}")
                await self.disconnect(poll_id, connection)
            except Exception as e:
                # Log other unexpected errors
                logger.error(f"Error broadcasting to client: {e}", exc_info=True)
                await self.disconnect(poll_id, connection)

manager = ConnectionManager()
