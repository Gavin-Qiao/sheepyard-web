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
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(poll_id, websocket)
