from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import SQLModel, Session
from config import settings
from auth import router as auth_router, get_current_user
from database import engine
from sqlalchemy import text
# Import models to ensure they are registered with SQLModel
from models import User, Poll, PollOption, Vote
from schemas import VoteCreate, PollCreate, PollRead, PollReadWithDetails
from services.vote_service import VoteService
from services.poll_service import PollService
from services.notification import NoOpNotificationService
from typing import List

print("Initializing FastAPI app...")
app = FastAPI()

app.include_router(auth_router, prefix="/api")

def create_db_and_tables():
    print("Creating database tables...")
    SQLModel.metadata.create_all(engine)

    # Simple migration hack for SQLite to add display_name if missing
    # This is safe because if it fails (column exists), we catch it.
    # In a production env, use Alembic.
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE user ADD COLUMN display_name VARCHAR"))
            conn.commit()
            print("Added display_name column to user table.")
        except Exception as e:
            # Column likely exists
            print(f"Schema check: {e}")

    print("Database tables created.")

@app.on_event("startup")
def on_startup():
    print("Startup event triggered.")
    create_db_and_tables()

@app.get("/api/health")
def read_root():
    print("Health check endpoint called!")
    return {"status": "ok"}

@app.get("/api/polls", response_model=List[PollRead])
def list_polls(
    session: Session = Depends(lambda: Session(engine))
):
    """
    List all polls.
    """
    poll_service = PollService(session)
    return poll_service.list_polls()

@app.post("/api/polls", response_model=PollRead)
def create_poll(
    poll_data: PollCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(lambda: Session(engine))
):
    """
    Create a new poll.
    """
    notification_service = NoOpNotificationService()
    poll_service = PollService(session, notification_service)
    return poll_service.create_poll(poll_data, user)

@app.get("/api/polls/{poll_id}", response_model=PollReadWithDetails)
def get_poll(
    poll_id: int,
    session: Session = Depends(lambda: Session(engine))
):
    """
    Get a poll by ID.
    """
    poll_service = PollService(session)
    return poll_service.get_poll(poll_id)

@app.post("/api/votes")
def vote(
    vote_data: VoteCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(lambda: Session(engine))
):
    """
    Toggle a vote for a poll option.
    """
    # Use NoOpNotificationService for now, or inject a real one if configured
    notification_service = NoOpNotificationService()
    vote_service = VoteService(session, notification_service)
    result = vote_service.cast_vote(user, vote_data.poll_option_id)
    return result
