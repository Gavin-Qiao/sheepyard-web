from sqlmodel import create_engine
import os
from config import settings

# Ensure directory exists
db_dir = os.path.dirname(settings.DB_PATH)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

sqlite_url = f"sqlite:///{settings.DB_PATH}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)
