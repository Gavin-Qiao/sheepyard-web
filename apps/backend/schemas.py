from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel
from pydantic import validator

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

class PollCreate(PollBase):
    options: List[PollOptionCreate]

    @validator("options")
    def must_have_at_least_one_option(cls, v):
        if not v:
            raise ValueError("Poll must have at least one option")
        return v

class PollRead(PollBase):
    id: int
    creator_id: int
    created_at: datetime
    options: List[PollOptionRead]
