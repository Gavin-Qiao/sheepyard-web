from fastapi import FastAPI
from sqlmodel import SQLModel
from database import engine
from sqlalchemy import text
# Import models to ensure they are registered with SQLModel
from models import User, Poll, PollOption, Vote, UserMention

from routers import auth, polls, votes, discord, users, profile

print("Initializing FastAPI app...")
app = FastAPI()

app.include_router(auth.router, prefix="/api")
app.include_router(polls.router, prefix="/api")
app.include_router(votes.router, prefix="/api")
app.include_router(discord.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(profile.router, prefix="/api")

def create_db_and_tables():
    print("Creating database tables...")
    SQLModel.metadata.create_all(engine)

    # Simple migration hack for SQLite
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE user ADD COLUMN display_name VARCHAR"))
            conn.commit()
            print("Added display_name column to user table.")
        except Exception:
            pass

        # Migration for Recurrence fields
        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN is_recurring BOOLEAN DEFAULT 0"))
            conn.commit()
            print("Added is_recurring column to poll table.")
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN recurrence_pattern VARCHAR"))
            conn.commit()
            print("Added recurrence_pattern column to poll table.")
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN recurrence_end_date TIMESTAMP"))
            conn.commit()
            print("Added recurrence_end_date column to poll table.")
        except Exception:
            pass

        # Migration for Deadline fields
        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN deadline_date TIMESTAMP"))
            conn.commit()
            print("Added deadline_date column to poll table.")
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN deadline_offset_minutes INTEGER"))
            conn.commit()
            print("Added deadline_offset_minutes column to poll table.")
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN deadline_channel_id VARCHAR"))
            conn.commit()
            print("Added deadline_channel_id column to poll table.")
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN deadline_message VARCHAR"))
            conn.commit()
            print("Added deadline_message column to poll table.")
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN deadline_mention_ids JSON"))
            conn.commit()
            print("Added deadline_mention_ids column to poll table.")
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE poll ADD COLUMN deadline_notification_sent BOOLEAN DEFAULT 0"))
            conn.commit()
            print("Added deadline_notification_sent column to poll table.")
        except Exception:
            pass

        # Migration for PollOption notification
        try:
            conn.execute(text("ALTER TABLE polloption ADD COLUMN notification_sent BOOLEAN DEFAULT 0"))
            conn.commit()
            print("Added notification_sent column to polloption table.")
        except Exception:
            pass

        # Migration for User guild_joined_at
        try:
            conn.execute(text("ALTER TABLE user ADD COLUMN guild_joined_at TIMESTAMP"))
            conn.commit()
            print("Added guild_joined_at column to user table.")
        except Exception:
            pass

    print("Database tables created.")

import asyncio
from tasks import check_deadlines

@app.on_event("startup")
def on_startup():
    print("Startup event triggered.")
    create_db_and_tables()
    asyncio.create_task(check_deadlines())

@app.get("/api/health")
def read_root():
    print("Health check endpoint called!")
    return {"status": "ok"}
