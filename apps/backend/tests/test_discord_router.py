
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlmodel import Session
from models import User, Poll, PollOption
from routers.discord import router
from services.discord_service import discord_service
from main import app
from datetime import datetime, timedelta

@pytest.fixture
def mock_discord_service():
    with patch("routers.discord.discord_service") as mock:
        yield mock

def test_get_discord_channels(client, mock_discord_service, test_user):
    # Mock service return
    mock_discord_service.get_guild_channels.return_value = [
        {"id": "123", "name": "general", "position": 0}
    ]

    # Override auth dependency
    from dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: test_user

    response = client.get("/api/discord/channels")
    assert response.status_code == 200
    assert response.json() == [{"id": "123", "name": "general", "position": 0}]

def test_share_poll_to_discord(client, session, test_user, mock_discord_service):
    # Create a poll
    poll = Poll(
        title="Test Poll",
        description="Desc",
        creator_id=test_user.id
    )
    session.add(poll)
    session.commit()
    session.refresh(poll)

    # Mock Service
    mock_discord_service.send_poll_share_message.return_value = {"id": "msg_123"}

    from dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: test_user

    payload = {
        "poll_id": poll.id,
        "channel_id": "12345"
    }

    response = client.post("/api/discord/share", json=payload)
    assert response.status_code == 200
    assert response.json() == {"message": "Shared successfully", "discord_message_id": "msg_123"}

    # Verify service called with correct args
    mock_discord_service.send_poll_share_message.assert_called_once()
    args = mock_discord_service.send_poll_share_message.call_args
    assert args.kwargs['channel_id'] == "12345"
    assert args.kwargs['poll'].id == poll.id

def test_share_nonexistent_poll(client, test_user, mock_discord_service):
    from dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: test_user

    payload = {
        "poll_id": 99999,
        "channel_id": "12345"
    }

    response = client.post("/api/discord/share", json=payload)
    assert response.status_code == 404
