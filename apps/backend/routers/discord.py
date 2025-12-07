from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from typing import List, Dict
from pydantic import BaseModel

from config import settings
from dependencies import get_session, get_current_user
from models import User, Poll
from services.discord_service import discord_service

router = APIRouter()

class SharePollRequest(BaseModel):
    poll_id: int
    channel_id: str
    custom_message: str = None

@router.get("/discord/channels", response_model=List[Dict])
def get_discord_channels(
    current_user: User = Depends(get_current_user)
):
    """
    Fetch list of available text channels in the configured Discord Guild.
    User must be authenticated.
    """
    try:
        channels = discord_service.get_guild_channels(settings.DISCORD_GUILD_ID)
        return channels
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/discord/members", response_model=List[Dict])
def get_discord_members(
    current_user: User = Depends(get_current_user)
):
    """
    Fetch list of members in the configured Discord Guild.
    User must be authenticated.
    """
    try:
        members = discord_service.get_guild_members(settings.DISCORD_GUILD_ID)
        return members
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discord/share")
def share_poll_to_discord(
    share_request: SharePollRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Share a poll to a specific Discord channel.
    """
    # Verify Poll exists
    poll = session.get(Poll, share_request.poll_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    # We might want to ensure the current user has access to this poll,
    # but currently all polls are public to authenticated users.

    try:
        # We need to pass the creator. The poll.creator might not be eagerly loaded?
        # SQLModel usually lazy loads unless configured.
        # But we can access poll.creator if it was loaded or we can join.
        # Let's ensure we have it.
        if not poll.creator:
             # Just in case, though it should be there if relationship is set up correctly
             # and we are inside a session.
             # Explicitly fetch if needed, or rely on lazy loading within session.
             # Since 'session' is active, lazy loading should work.
             pass

        result = discord_service.send_poll_share_message(
            channel_id=share_request.channel_id,
            poll=poll,
            creator=poll.creator,
            frontend_url=settings.FRONTEND_URL,
            custom_message=share_request.custom_message
        )
        return {"message": "Shared successfully", "discord_message_id": result.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
