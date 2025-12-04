from pydantic_settings import BaseSettings
import sys

class Settings(BaseSettings):
    DISCORD_CLIENT_ID: str
    DISCORD_CLIENT_SECRET: str
    DISCORD_REDIRECT_URI: str
    DISCORD_GUILD_ID: str
    SECRET_KEY: str
    FRONTEND_URL: str = "http://localhost:5173"  # Default for local dev
    DB_PATH: str = "/data/app.db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

try:
    print("Loading environment variables...")
    settings = Settings()
    print("Environment variables loaded successfully.")
except Exception as e:
    print("CRITICAL ERROR: Failed to load environment variables. Check your .env file or environment variables.")
    print(f"Details: {e}")
    # We re-raise to ensure the app doesn't start in an invalid state,
    # but the print above helps the user see it in the logs immediately.
    raise e
