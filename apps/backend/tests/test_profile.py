
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from models import User, UserUnavailability
from main import app
from dependencies import get_session, get_current_user

# --- Fixtures ---
@pytest.fixture(name="client")
def client_fixture(session: Session, test_user: User):
    def get_session_override():
        return session

    def get_current_user_override():
        return test_user

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_user] = get_current_user_override
    return TestClient(app)

# --- Tests ---
def test_create_unavailability(client: TestClient, session: Session, test_user: User):
    start = datetime.utcnow() + timedelta(days=1)
    end = start + timedelta(hours=2)
    payload = {
        "start_time": start.isoformat(),
        "end_time": end.isoformat()
    }

    response = client.post("/api/profile/unavailability", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["start_time"] == payload["start_time"]
    assert data["end_time"] == payload["end_time"]
    assert data["id"] is not None

    # Verify DB
    db_block = session.get(UserUnavailability, data["id"])
    assert db_block is not None
    assert db_block.user_id == test_user.id

def test_get_unavailability(client: TestClient, session: Session, test_user: User):
    # Create a block manually
    start = datetime.utcnow()
    end = start + timedelta(hours=1)
    block = UserUnavailability(user_id=test_user.id, start_time=start, end_time=end)
    session.add(block)
    session.commit()

    response = client.get("/api/profile/unavailability")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == block.id

def test_delete_unavailability(client: TestClient, session: Session, test_user: User):
    # Create a block manually
    start = datetime.utcnow()
    end = start + timedelta(hours=1)
    block = UserUnavailability(user_id=test_user.id, start_time=start, end_time=end)
    session.add(block)
    session.commit()

    response = client.delete(f"/api/profile/unavailability/{block.id}")
    assert response.status_code == 200

    # Verify deletion
    assert session.get(UserUnavailability, block.id) is None

def test_delete_unavailability_unauthorized(client: TestClient, session: Session):
    # Create another user and block
    other_user = User(discord_id="other", username="other")
    session.add(other_user)
    session.commit()

    start = datetime.utcnow()
    end = start + timedelta(hours=1)
    block = UserUnavailability(user_id=other_user.id, start_time=start, end_time=end)
    session.add(block)
    session.commit()

    # Try to delete with current user (test_user)
    response = client.delete(f"/api/profile/unavailability/{block.id}")
    assert response.status_code == 403

    # Verify not deleted
    assert session.get(UserUnavailability, block.id) is not None

def test_create_unavailability_invalid_times(client: TestClient):
    start = datetime.utcnow()
    end = start - timedelta(hours=1) # End before start
    payload = {
        "start_time": start.isoformat(),
        "end_time": end.isoformat()
    }

    response = client.post("/api/profile/unavailability", json=payload)
    assert response.status_code == 400
