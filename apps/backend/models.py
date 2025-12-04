from typing import Optional
from sqlmodel import Field, SQLModel

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    discord_id: str = Field(index=True, unique=True)
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
