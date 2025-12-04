from fastapi import FastAPI
from sqlmodel import SQLModel
from config import settings
from auth import router as auth_router
from database import engine
from sqlalchemy import text

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
