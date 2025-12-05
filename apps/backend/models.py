from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, SQLModel, UniqueConstraint, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    discord_id: str = Field(index=True, unique=True)
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    polls: List["Poll"] = Relationship(back_populates="creator")
    votes: List["Vote"] = Relationship(back_populates="user")

class Poll(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    creator_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    creator: Optional[User] = Relationship(back_populates="polls")
    options: List["PollOption"] = Relationship(back_populates="poll", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class PollOption(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    poll_id: int = Field(foreign_key="poll.id")
    label: str
    start_time: datetime
    end_time: datetime

    poll: Optional[Poll] = Relationship(back_populates="options")
    votes: List["Vote"] = Relationship(back_populates="poll_option", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Vote(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("poll_option_id", "user_id"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    poll_option_id: int = Field(foreign_key="polloption.id")
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    poll_option: Optional[PollOption] = Relationship(back_populates="votes")
    user: Optional[User] = Relationship(back_populates="votes")
