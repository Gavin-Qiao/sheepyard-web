from fastapi import FastAPI, Depends
from sqlmodel import SQLModel, Session, create_engine, select
from typing import Annotated
import os
from contextlib import asynccontextmanager

from fastapi import HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import select

# Import models to ensure they are registered with SQLModel
from .models import User
from .auth import (
    create_access_token,
    exchange_code_for_token,
    get_discord_user,
    check_user_guild,
    verify_token,
    Token,
    TokenData,
    DISCORD_CLIENT_ID,
    DISCORD_REDIRECT_URI,
    DISCORD_GUILD_ID
)

# Database Setup
DB_PATH = os.getenv("DB_PATH", "/data/app.db")
sqlite_url = f"sqlite:///{DB_PATH}"

# check_same_thread=False is needed for SQLite with FastAPI
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def init_db():
    # Ensure directory exists
    db_dir = os.path.dirname(DB_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/api/health")
def read_root():
    return {"status": "ok"}

@app.get("/api/auth/login")
def login():
    if not DISCORD_CLIENT_ID or not DISCORD_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Discord configuration missing")

    # scope=identify guilds
    return RedirectResponse(
        f"https://discord.com/api/oauth2/authorize?client_id={DISCORD_CLIENT_ID}&redirect_uri={DISCORD_REDIRECT_URI}&response_type=code&scope=identify%20guilds"
    )

@app.get("/api/auth/callback")
async def auth_callback(session: SessionDep, code: str = None, error: str = None):
    if error:
        raise HTTPException(status_code=400, detail=f"Authentication error: {error}")

    if not code:
        raise HTTPException(status_code=400, detail="Code missing")

    # 1. Exchange code for Discord token
    try:
        token_data = await exchange_code_for_token(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to exchange code: {str(e)}")

    discord_access_token = token_data["access_token"]

    # 2. Check Guild Membership if required
    if DISCORD_GUILD_ID:
        is_member = await check_user_guild(discord_access_token, DISCORD_GUILD_ID)
        if not is_member:
            raise HTTPException(status_code=403, detail="You are not a member of the required Discord server.")

    # 3. Get User Info
    try:
        discord_user = await get_discord_user(discord_access_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get user info: {str(e)}")

    # 4. Create or Update User in DB
    discord_id = discord_user["id"]
    username = discord_user["username"]
    avatar = discord_user.get("avatar")
    avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar}.png" if avatar else None

    statement = select(User).where(User.discord_id == discord_id)
    results = session.exec(statement)
    user = results.first()

    if not user:
        user = User(discord_id=discord_id, username=username, avatar_url=avatar_url)
        session.add(user)
    else:
        user.username = username
        user.avatar_url = avatar_url
        session.add(user)

    session.commit()
    session.refresh(user)

    # 5. Create JWT
    access_token = create_access_token(data={"sub": user.discord_id})

    # Redirect to frontend with token (simple approach for now)
    # Ideally, we might set a cookie or return a page that sends a message to opener
    # For this task, let's redirect to the dashboard with the token in query param
    # (NOT SECURE for prod but okay for initial setup, better to use cookies or a temp code)
    # A cleaner way is to redirect to the frontend /auth-success page with the token
    return RedirectResponse(url=f"/?token={access_token}")

@app.get("/api/users/me", response_model=User)
def read_users_me(session: SessionDep, token_data: TokenData = Depends(verify_token)):
    """
    Get the current authenticated user.
    """
    statement = select(User).where(User.discord_id == token_data.discord_id)
    results = session.exec(statement)
    user = results.first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
