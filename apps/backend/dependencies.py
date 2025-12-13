from fastapi import Depends, HTTPException, status, Request, WebSocket, WebSocketException
from sqlmodel import Session, select
from jose import jwt, JWTError

from config import settings
from database import engine
from models import User
from security import ALGORITHM

def get_session():
    with Session(engine) as session:
        yield session

def get_current_user(request: Request, session: Session = Depends(get_session)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        discord_id: str = payload.get("sub")
        if discord_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    statement = select(User).where(User.discord_id == discord_id)
    user = session.exec(statement).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

async def get_current_user_ws(websocket: WebSocket, session: Session = Depends(get_session)):
    token = websocket.cookies.get("access_token")
    if not token:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Not authenticated")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        discord_id: str = payload.get("sub")
        if discord_id is None:
             raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
    except JWTError:
         raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")

    statement = select(User).where(User.discord_id == discord_id)
    user = session.exec(statement).first()
    if user is None:
         raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
    return user
