from pydantic_settings import BaseSettings

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

settings = Settings()
