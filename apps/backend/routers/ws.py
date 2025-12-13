from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from models import User
from dependencies import get_current_user_ws
from managers.connection_manager import manager

router = APIRouter()

@router.websocket("/ws/polls/{poll_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    poll_id: int,
    user: User = Depends(get_current_user_ws)
):
    await manager.connect(poll_id, websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(poll_id, websocket)
