from typing import List, Optional, Any
from datetime import datetime
from sqlmodel import SQLModel
from pydantic import validator

class UserRead(SQLModel):
    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

class PollOptionBase(SQLModel):
    label: str
    start_time: datetime
    end_time: datetime

    @validator("end_time")
    def end_time_must_be_after_start_time(cls, v, values):
        if "start_time" in values and v <= values["start_time"]:
            raise ValueError("end_time must be after start_time")
        return v

class PollOptionCreate(PollOptionBase):
    pass

class PollOptionRead(PollOptionBase):
    id: int
    poll_id: int

class PollBase(SQLModel):
    title: str
    description: Optional[str] = None

    # Deadline fields
    deadline_date: Optional[datetime] = None
    deadline_offset_minutes: Optional[int] = None
    deadline_channel_id: Optional[str] = None
    deadline_message: Optional[str] = None
    deadline_mention_ids: Optional[List[int]] = None # Changed from JSON in DB to List[int] in Schema

class PollUpdate(PollBase):
    # Recurrence update fields
    # If these are present, it implies a "Modify Series" action
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None
    apply_changes_from: Optional[datetime] = None # The cut-off date for modification

class PollCreate(PollBase):
    # Recurrence fields
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[datetime] = None

    options: List[PollOptionCreate]

    @validator("options")
    def must_have_at_least_one_option(cls, v, values):
        if not v:
            raise ValueError("Poll must have at least one option (as template or explicit list)")
        return v

class PollRead(PollBase):
    id: int
    creator_id: int
    created_at: datetime
    is_recurring: bool
    recurrence_pattern: Optional[str]
    recurrence_end_date: Optional[datetime]
    options: List[PollOptionRead]

    # Deadline fields explicitly in Read model if PollBase doesn't cover it properly due to inheritance details
    # But PollBase has them now.

class VoteCreate(SQLModel):
    poll_option_id: int

class VoteRead(SQLModel):
    poll_option_id: int
    user: UserRead

class PollOptionReadWithVotes(PollOptionRead):
    votes: List[VoteRead] = []

class PollReadWithDetails(PollRead):
    creator: UserRead
    options: List[PollOptionReadWithVotes]
