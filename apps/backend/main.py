from fastapi import FastAPI
from sqlmodel import SQLModel
from config import settings
from auth import router as auth_router
from database import engine

app = FastAPI()

app.include_router(auth_router, prefix="/api")

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/api/health")
def read_root():
    return {"status": "ok"}
