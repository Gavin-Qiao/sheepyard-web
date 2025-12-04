from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, UniqueConstraint

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    discord_id: str = Field(index=True, unique=True)
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

class Poll(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    creator_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PollOption(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    poll_id: int = Field(foreign_key="poll.id")
    label: str
    start_time: datetime
    end_time: datetime

class Vote(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("poll_option_id", "user_id"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    poll_option_id: int = Field(foreign_key="polloption.id")
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
