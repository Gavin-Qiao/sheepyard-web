from fastapi import FastAPI
import os
import sqlite3

app = FastAPI()

DB_PATH = os.getenv("DB_PATH", "/data/app.db")

def init_db():
    # Ensure directory exists if it's not the root
    db_dir = os.path.dirname(DB_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.close()

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/api/health")
def read_root():
    return {"status": "ok"}
