import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from models import User, Poll, PollOption
from main import app
from dependencies import get_current_user, get_session
from datetime import datetime, timedelta

@pytest.fixture(name="client")
def client_fixture(session: Session, test_user: User):
    def get_session_override():
        yield session

    def get_current_user_override():
        return test_user

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_user] = get_current_user_override

    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_vote_api(client: TestClient, session: Session, test_user: User):
    # Create poll and option
    poll = Poll(title="Vote Poll", creator_id=test_user.id)
    session.add(poll)
    session.flush()
    option = PollOption(
        label="Vote Option",
        start_time=datetime.utcnow(),
        end_time=datetime.utcnow() + timedelta(hours=1),
        poll_id=poll.id
    )
    session.add(option)
    session.commit()
    session.refresh(option)

    # Cast Vote
    response = client.post(
        "/api/votes",
        json={"poll_option_id": option.id}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "added"

    # Toggle Vote (Remove)
    response = client.post(
        "/api/votes",
        json={"poll_option_id": option.id}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "removed"
