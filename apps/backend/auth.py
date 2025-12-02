import os
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
import httpx
from pydantic import BaseModel

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "insecure-secret-key-for-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:80/api/auth/callback")
DISCORD_GUILD_ID = os.getenv("DISCORD_GUILD_ID")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    discord_id: Optional[str] = None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_token(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        discord_id: str = payload.get("sub")
        if discord_id is None:
            raise credentials_exception
        token_data = TokenData(discord_id=discord_id)
    except JWTError:
        raise credentials_exception
    return token_data

async def exchange_code_for_token(code: str):
    data = {
        "client_id": DISCORD_CLIENT_ID,
        "client_secret": DISCORD_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": DISCORD_REDIRECT_URI,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    async with httpx.AsyncClient() as client:
        response = await client.post("https://discord.com/api/oauth2/token", data=data, headers=headers)
        response.raise_for_status()
        return response.json()

async def get_discord_user(access_token: str):
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient() as client:
        response = await client.get("https://discord.com/api/users/@me", headers=headers)
        response.raise_for_status()
        return response.json()

async def check_user_guild(access_token: str, guild_id: str):
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient() as client:
        # Get user's guilds
        response = await client.get("https://discord.com/api/users/@me/guilds", headers=headers)
        response.raise_for_status()
        guilds = response.json()

        # Check if user is in the required guild
        for guild in guilds:
            if guild["id"] == guild_id:
                return True
        return False
