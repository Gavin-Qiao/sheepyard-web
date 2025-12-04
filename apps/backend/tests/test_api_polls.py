import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from models import User, Poll
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

def test_create_poll_api(client: TestClient):
    response = client.post(
        "/api/polls",
        json={
            "title": "API Poll",
            "description": "Created via API",
            "options": [
                {
                    "label": "Opt 1",
                    "start_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
                    "end_time": (datetime.utcnow() + timedelta(hours=2)).isoformat()
                }
            ]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "API Poll"
    assert data["creator_id"] is not None
    assert len(data["options"]) == 1

def test_list_polls_api(client: TestClient, session: Session, test_user: User):
    # Create a poll directly in DB
    poll = Poll(title="DB Poll", creator_id=test_user.id)
    session.add(poll)
    session.commit()

    response = client.get("/api/polls")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    titles = [p["title"] for p in data]
    assert "DB Poll" in titles

def test_get_poll_api(client: TestClient, session: Session, test_user: User):
    # Create poll via API to ensure full structure
    create_resp = client.post(
        "/api/polls",
        json={
            "title": "Get Poll API",
            "options": [
                {
                    "label": "Opt",
                    "start_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
                    "end_time": (datetime.utcnow() + timedelta(hours=2)).isoformat()
                }
            ]
        }
    )
    poll_id = create_resp.json()["id"]

    response = client.get(f"/api/polls/{poll_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Get Poll API"
    assert data["creator"]["username"] == test_user.username
