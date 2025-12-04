import httpx
from urllib.parse import quote
from fastapi import APIRouter, Depends, Response
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlmodel import Session, select
from datetime import timedelta

from config import settings
from models import User
from dependencies import get_session, get_current_user
from security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

@router.get("/auth/login")
def login():
    return RedirectResponse(
        f"https://discord.com/api/oauth2/authorize?client_id={settings.DISCORD_CLIENT_ID}&redirect_uri={quote(settings.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20guilds%20guilds.members.read"
    )

@router.get("/auth/callback")
def callback(code: str, response: Response, session: Session = Depends(get_session)):
    data = {
        "client_id": settings.DISCORD_CLIENT_ID,
        "client_secret": settings.DISCORD_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.DISCORD_REDIRECT_URI,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    with httpx.Client() as client:
        token_response = client.post("https://discord.com/api/oauth2/token", data=data, headers=headers)
        if token_response.status_code != 200:
            return HTMLResponse(content="<h1>Login Failed: Could not get token from Discord</h1>", status_code=400)

        token_data = token_response.json()
        access_token = token_data["access_token"]

        # Get User Info
        user_response = client.get("https://discord.com/api/users/@me", headers={"Authorization": f"Bearer {access_token}"})
        if user_response.status_code != 200:
            return HTMLResponse(content="<h1>Login Failed: Could not get user info</h1>", status_code=400)

        user_data = user_response.json()

        # Get User Guilds
        guilds_response = client.get("https://discord.com/api/users/@me/guilds", headers={"Authorization": f"Bearer {access_token}"})
        if guilds_response.status_code != 200:
            return HTMLResponse(content="<h1>Login Failed: Could not get guilds</h1>", status_code=400)

        guilds = guilds_response.json()
        is_member = any(g["id"] == settings.DISCORD_GUILD_ID for g in guilds)

        if not is_member:
            return HTMLResponse(content="<h1>Login Failed: You are not a member of the required Discord Server.</h1>", status_code=403)

        # Get Guild Member Profile (Nickname)
        member_response = client.get(
            f"https://discord.com/api/users/@me/guilds/{settings.DISCORD_GUILD_ID}/member",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        display_name = None
        if member_response.status_code == 200:
            member_data = member_response.json()
            display_name = member_data.get("nick")

        # Fallback to global display name or username if no nick
        if not display_name:
            display_name = user_data.get("global_name") or user_data.get("username")

        # Create or Update User
        discord_id = user_data["id"]
        username = user_data["username"]
        avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{user_data['avatar']}.png" if user_data.get("avatar") else None

        statement = select(User).where(User.discord_id == discord_id)
        db_user = session.exec(statement).first()

        if not db_user:
            db_user = User(
                discord_id=discord_id,
                username=username,
                display_name=display_name,
                avatar_url=avatar_url
            )
            session.add(db_user)
        else:
            db_user.username = username
            db_user.display_name = display_name
            db_user.avatar_url = avatar_url
            session.add(db_user)

        session.commit()
        session.refresh(db_user)

        # Create JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(data={"sub": discord_id}, expires_delta=access_token_expires)

        # Set Cookie and Redirect
        response = RedirectResponse(url=settings.FRONTEND_URL)
        response.set_cookie(
            key="access_token",
            value=jwt_token,
            httponly=True,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            samesite="lax",
            secure=False # Set to True in production with HTTPS
        )
        return response

@router.get("/users/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", httponly=True, samesite="lax", secure=False)
    return {"message": "Logged out successfully"}
