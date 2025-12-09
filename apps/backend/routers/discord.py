from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from typing import List, Dict, Optional
from pydantic import BaseModel

from config import settings
from dependencies import get_session, get_current_user
from models import User, Poll
from services.discord_service import discord_service
from services.mention_service import mention_service

router = APIRouter()

class SharePollRequest(BaseModel):
    poll_id: int
    channel_id: str
    custom_message: Optional[str] = None
    mentioned_user_ids: Optional[List[int]] = None

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
    # Special case for Profile Sharing
    if share_request.poll_id == 0:
        try:
             # Record mentions if any
            if share_request.mentioned_user_ids:
                mention_service.record_mentions(session, current_user.id, share_request.mentioned_user_ids)

            result = discord_service.send_profile_share_message(
                channel_id=share_request.channel_id,
                file_owner=current_user,
                frontend_url=settings.FRONTEND_URL,
                custom_message=share_request.custom_message,
                mentioned_user_ids=share_request.mentioned_user_ids,
                db_session=session
            )
            return {"message": "Profile shared successfully", "discord_message_id": result.get("id")}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Verify Poll exists
    poll = session.get(Poll, share_request.poll_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    try:
        # Record mentions if any
        if share_request.mentioned_user_ids:
            mention_service.record_mentions(session, current_user.id, share_request.mentioned_user_ids)

        result = discord_service.send_poll_share_message(
            channel_id=share_request.channel_id,
            poll=poll,
            creator=poll.creator,
            frontend_url=settings.FRONTEND_URL,
            custom_message=share_request.custom_message,
            mentioned_user_ids=share_request.mentioned_user_ids,
            db_session=session
        )
        return {"message": "Shared successfully", "discord_message_id": result.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
