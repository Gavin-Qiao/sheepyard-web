from fastapi import FastAPI
from sqlmodel import SQLModel
from database import engine
from sqlalchemy import text
# Import models to ensure they are registered with SQLModel
from models import User, Poll, PollOption, Vote

from routers import auth, polls, votes

print("Initializing FastAPI app...")
app = FastAPI()

app.include_router(auth.router, prefix="/api")
app.include_router(polls.router, prefix="/api")
app.include_router(votes.router, prefix="/api")

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

        # Migration for Recurrence fields
        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN is_recurring BOOLEAN DEFAULT 0"))
            conn.commit()
            print("Added is_recurring column to poll table.")
        except Exception as e:
             print(f"Schema check (is_recurring): {e}")

        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN recurrence_pattern VARCHAR"))
            conn.commit()
            print("Added recurrence_pattern column to poll table.")
        except Exception as e:
             print(f"Schema check (recurrence_pattern): {e}")

        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN recurrence_end_date TIMESTAMP"))
            conn.commit()
            print("Added recurrence_end_date column to poll table.")
        except Exception as e:
             print(f"Schema check (recurrence_end_date): {e}")

    print("Database tables created.")

@app.on_event("startup")
def on_startup():
    print("Startup event triggered.")
    create_db_and_tables()

@app.get("/api/health")
def read_root():
    print("Health check endpoint called!")
    return {"status": "ok"}
