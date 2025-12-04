import pytest
from datetime import datetime, timedelta
from pydantic import ValidationError
from fastapi import HTTPException

from services.poll_service import PollService
from schemas import PollCreate, PollOptionCreate
from services.notification import NotificationService

class MockNotificationService:
    def __init__(self):
        self.created_calls = []
        self.vote_calls = []

    def notify_poll_created(self, poll_title: str, creator_name: str, poll_id: int) -> None:
        self.created_calls.append({
            "poll_title": poll_title,
            "creator_name": creator_name,
            "poll_id": poll_id
        })

    def notify_vote_cast(self, poll_title: str, voter_name: str, option_label: str) -> None:
        self.vote_calls.append((poll_title, voter_name, option_label))

def test_create_poll(session, test_user):
    mock_notification = MockNotificationService()
    service = PollService(session, mock_notification)

    poll_create = PollCreate(
        title="Test Poll",
        description="Description",
        options=[
            PollOptionCreate(
                label="Option 1",
                start_time=datetime.utcnow() + timedelta(hours=1),
                end_time=datetime.utcnow() + timedelta(hours=2)
            )
        ]
    )

    poll = service.create_poll(poll_create, test_user)

    assert poll.id is not None
    assert poll.title == "Test Poll"
    assert poll.creator_id == test_user.id
    assert len(poll.options) == 1
    assert poll.options[0].label == "Option 1"

    # Verify notification
    assert len(mock_notification.created_calls) == 1
    assert mock_notification.created_calls[0]["poll_title"] == "Test Poll"
    assert mock_notification.created_calls[0]["creator_name"] == "Tester"

def test_create_poll_validation_error():
    # Test that Schema validation fails for end_time <= start_time
    # This is actually a Schema test, but good to verify usage
    with pytest.raises(ValidationError):
        PollOptionCreate(
            label="Invalid",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow() - timedelta(hours=1)
        )

def test_get_poll(session, test_user):
    mock_notification = MockNotificationService()
    service = PollService(session, mock_notification)

    # Create manually or via service
    poll_create = PollCreate(
        title="Get Poll Test",
        options=[
            PollOptionCreate(
                label="Opt",
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow() + timedelta(hours=1)
            )
        ]
    )
    created = service.create_poll(poll_create, test_user)

    fetched = service.get_poll(created.id)
    assert fetched.id == created.id
    assert fetched.title == "Get Poll Test"
    assert len(fetched.options) == 1

def test_get_poll_not_found(session):
    service = PollService(session)
    with pytest.raises(HTTPException) as exc:
        service.get_poll(999)
    assert exc.value.status_code == 404

def test_list_polls(session, test_user):
    service = PollService(session)

    service.create_poll(PollCreate(title="P1", options=[PollOptionCreate(label="O", start_time=datetime.utcnow(), end_time=datetime.utcnow()+timedelta(1))]), test_user)
    service.create_poll(PollCreate(title="P2", options=[PollOptionCreate(label="O", start_time=datetime.utcnow(), end_time=datetime.utcnow()+timedelta(1))]), test_user)

    polls = service.list_polls()
    assert len(polls) >= 2
    titles = [p.title for p in polls]
    assert "P1" in titles
    assert "P2" in titles
