from typing import Optional
from fastapi import Depends, HTTPException, status, Request, WebSocket, WebSocketException
from sqlmodel import Session, select
from jose import jwt, JWTError

from config import settings
from database import engine
from models import User
from security import ALGORITHM
from managers.connection_manager import ConnectionManager

def get_session():
    with Session(engine) as session:
        yield session

def _get_user_from_token(token: str, session: Session) -> Optional[User]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        discord_id: str = payload.get("sub")
        if discord_id is None:
            return None
    except JWTError:
        return None

    statement = select(User).where(User.discord_id == discord_id)
    user = session.exec(statement).first()
    return user

def get_current_user(request: Request, session: Session = Depends(get_session)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    user = _get_user_from_token(token, session)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token or user not found")
    return user

async def get_current_user_ws(websocket: WebSocket, session: Session = Depends(get_session)):
    token = websocket.cookies.get("access_token")
    if not token:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Not authenticated")
    
    user = _get_user_from_token(token, session)
    if not user:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token or user not found")
    return user

def get_connection_manager(request: Request) -> ConnectionManager:
    return request.app.state.connection_manager
