from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Map poll_id to list of active WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, poll_id: int, websocket: WebSocket):
        await websocket.accept()
        if poll_id not in self.active_connections:
            self.active_connections[poll_id] = []
        self.active_connections[poll_id].append(websocket)

    def disconnect(self, poll_id: int, websocket: WebSocket):
        if poll_id in self.active_connections:
            if websocket in self.active_connections[poll_id]:
                self.active_connections[poll_id].remove(websocket)
            if not self.active_connections[poll_id]:
                del self.active_connections[poll_id]

    async def broadcast(self, poll_id: int, message: dict):
        if poll_id in self.active_connections:
            # Create a copy of the list to iterate over safely
            connections = self.active_connections[poll_id][:]
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    # If sending fails, assume connection is dead and remove it
                    pass

manager = ConnectionManager()
