import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from models import User
from dependencies import get_current_user_ws

router = APIRouter()

@router.websocket("/ws/polls/{poll_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    poll_id: int,
    user: User = Depends(get_current_user_ws)
):
    manager = websocket.app.state.connection_manager
    await manager.connect(poll_id, websocket)
    try:
        while True:
            try:
                # Wait for a message from the client with a timeout.
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # No message from client, send a ping to keep the connection alive.
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        # Client disconnected.
        pass
    finally:
        await manager.disconnect(poll_id, websocket)
