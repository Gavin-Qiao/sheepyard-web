
import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from fastapi.testclient import TestClient
from main import app, get_current_user
from models import User, Poll, PollOption, Vote
from services.vote_service import VoteService
from services.notification import NoOpNotificationService
from datetime import datetime, timedelta

# Setup in-memory database for testing
@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session_override] = lambda: session # This might fail if the dependency key is different.
    # Actually, in main.py we use `session: Session = Depends(lambda: Session(engine))`
    # and `user: User = Depends(get_current_user)`

    # We need to override the specific dependency that `main.py` uses.
    # Since `main.py` uses a lambda, we can't easily target it by function reference unless we extract it.
    # However, FastAPI allows overriding by type if configured? No.
    # Usually we extract the `get_session` function.

    # Let's see if we can patch it or if we should refactor main.py lightly to be testable.
    # For now, let's unit test the Service class directly, which is more robust for logic verification.
    # Then we can integration test the API.

    yield TestClient(app)
    app.dependency_overrides.clear()

def test_cast_vote_creates_vote(session: Session):
    # Setup
    user = User(discord_id="123", username="testuser", display_name="Test User")
    session.add(user)

    poll = Poll(title="Test Poll", creator_id=1, creator=user)
    session.add(poll)

    option = PollOption(
        label="Option A",
        start_time=datetime.utcnow(),
        end_time=datetime.utcnow() + timedelta(hours=1),
        poll=poll
    )
    session.add(option)
    session.commit()
    session.refresh(user)
    session.refresh(option)

    service = VoteService(session, NoOpNotificationService())

    # Act
    result = service.cast_vote(user, option.id)

    # Assert
    assert result["status"] == "added"
    assert result["poll_option_id"] == option.id

    votes = session.query(Vote).all()
    assert len(votes) == 1
    assert votes[0].user_id == user.id
    assert votes[0].poll_option_id == option.id

def test_cast_vote_toggles_vote(session: Session):
    # Setup
    user = User(discord_id="123", username="testuser")
    session.add(user)
    poll = Poll(title="Test Poll", creator_id=1, creator=user)
    session.add(poll)
    option = PollOption(label="Option A", start_time=datetime.utcnow(), end_time=datetime.utcnow(), poll=poll)
    session.add(option)
    session.commit()
    session.refresh(user)
    session.refresh(option)

    # Pre-existing vote
    vote = Vote(user_id=user.id, poll_option_id=option.id)
    session.add(vote)
    session.commit()

    service = VoteService(session, NoOpNotificationService())

    # Act
    result = service.cast_vote(user, option.id)

    # Assert
    assert result["status"] == "removed"
    votes = session.query(Vote).all()
    assert len(votes) == 0

def test_vote_notification(session: Session):
    # Mock notification service
    class MockNotificationService:
        def __init__(self):
            self.called = False
            self.poll_title = None
            self.voter_name = None
            self.option_label = None

        def notify_poll_created(self, poll_title: str, creator_name: str, poll_id: int) -> None:
            pass

        def notify_vote_cast(self, poll_title: str, voter_name: str, option_label: str) -> None:
            self.called = True
            self.poll_title = poll_title
            self.voter_name = voter_name
            self.option_label = option_label

    mock_notifier = MockNotificationService()

    user = User(discord_id="123", username="testuser", display_name="Test User")
    session.add(user)
    poll = Poll(title="My Poll", creator_id=1, creator=user)
    session.add(poll)
    option = PollOption(label="2:00 PM", start_time=datetime.utcnow(), end_time=datetime.utcnow(), poll=poll)
    session.add(option)
    session.commit()
    session.refresh(user)
    session.refresh(option)

    service = VoteService(session, mock_notifier)
    service.cast_vote(user, option.id)

    assert mock_notifier.called
    assert mock_notifier.poll_title == "My Poll"
    assert mock_notifier.voter_name == "Test User"
    assert mock_notifier.option_label == "2:00 PM"
