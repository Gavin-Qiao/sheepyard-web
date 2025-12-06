import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool
from models import User
from typing import Generator

# Use in-memory SQLite for tests
DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="session")
def session_fixture() -> Generator[Session, None, None]:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="test_user")
def test_user_fixture(session: Session) -> User:
    user = User(
        discord_id="test_discord_id",
        username="TestUser",
        display_name="Tester",
        avatar_url="http://example.com/avatar"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator:
    from main import app
    from dependencies import get_session
    from fastapi.testclient import TestClient

    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
