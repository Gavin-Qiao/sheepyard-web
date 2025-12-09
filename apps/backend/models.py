from typing import Optional, List, Dict
from datetime import datetime
from sqlmodel import Field, SQLModel, UniqueConstraint, Relationship
from sqlalchemy import Column, JSON

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    discord_id: str = Field(index=True, unique=True)
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    polls: List["Poll"] = Relationship(back_populates="creator")
    votes: List["Vote"] = Relationship(back_populates="user")
    mentions_created: List["UserMention"] = Relationship(back_populates="creator", sa_relationship_kwargs={"foreign_keys": "UserMention.creator_id"})
    mentions_received: List["UserMention"] = Relationship(back_populates="target_user", sa_relationship_kwargs={"foreign_keys": "UserMention.target_user_id"})
    unavailability: List["UserUnavailability"] = Relationship(back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class UserUnavailability(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    start_time: datetime
    end_time: datetime

    user: Optional[User] = Relationship(back_populates="unavailability")

class UserMention(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("creator_id", "target_user_id"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    creator_id: int = Field(foreign_key="user.id")
    target_user_id: int = Field(foreign_key="user.id")
    last_mentioned_at: datetime = Field(default_factory=datetime.utcnow)

    creator: Optional[User] = Relationship(back_populates="mentions_created", sa_relationship_kwargs={"foreign_keys": "UserMention.creator_id"})
    target_user: Optional[User] = Relationship(back_populates="mentions_received", sa_relationship_kwargs={"foreign_keys": "UserMention.target_user_id"})

class Poll(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    creator_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Recurrence Fields
    is_recurring: bool = Field(default=False)
    recurrence_pattern: Optional[str] = None # JSON string or text description of rule
    recurrence_end_date: Optional[datetime] = None

    # Deadline Fields
    deadline_date: Optional[datetime] = None # For one-time polls
    deadline_offset_minutes: Optional[int] = None # For recurring polls
    deadline_channel_id: Optional[str] = None
    deadline_message: Optional[str] = None
    deadline_mention_ids: List[int] = Field(default_factory=list, sa_column=Column(JSON)) # Store list of user IDs
    deadline_notification_sent: bool = Field(default=False) # For one-time polls

    creator: Optional[User] = Relationship(back_populates="polls")
    options: List["PollOption"] = Relationship(back_populates="poll", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class PollOption(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    poll_id: int = Field(foreign_key="poll.id")
    label: str
    start_time: datetime
    end_time: datetime

    notification_sent: bool = Field(default=False) # For recurring instances

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
