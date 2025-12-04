from fastapi import FastAPI
from sqlmodel import SQLModel
from config import settings
from auth import router as auth_router
from database import engine

print("Initializing FastAPI app...")
app = FastAPI()

app.include_router(auth_router, prefix="/api")

def create_db_and_tables():
    print("Creating database tables...")
    SQLModel.metadata.create_all(engine)
    print("Database tables created.")

@app.on_event("startup")
def on_startup():
    print("Startup event triggered.")
    create_db_and_tables()

@app.get("/api/health")
def read_root():
    print("Health check endpoint called!")
    return {"status": "ok"}
