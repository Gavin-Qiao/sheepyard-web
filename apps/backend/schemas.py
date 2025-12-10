from typing import List, Optional, Any
from datetime import datetime, timezone
from sqlmodel import SQLModel
from pydantic import validator, field_serializer

def serialize_utc_datetime(dt: datetime) -> str:
    """Serialize datetime to ISO format with 'Z' suffix for UTC.
    
    Backend stores naive UTC datetimes. This ensures they are always
    serialized with 'Z' suffix so frontend JavaScript correctly interprets
    them as UTC, not local time.
    """
    if dt is None:
        return None
    # If naive, assume UTC and add timezone info
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    # Format as ISO and ensure 'Z' suffix (replace +00:00 with Z)
    iso_str = dt.isoformat()
    return iso_str.replace('+00:00', 'Z')

class UTCModel(SQLModel):
    """Base model that ensures all datetime fields serialize with 'Z' suffix.
    
    This prevents timezone bugs where frontend's new Date() interprets
    naive datetime strings as local time instead of UTC.
    """
    
    @field_serializer('*', mode='wrap')
    def serialize_all_datetimes(self, value: Any, handler, info):
        # Only handle datetime fields
        if isinstance(value, datetime):
            return serialize_utc_datetime(value)
        # For non-datetime fields, use default serialization
        return handler(value)

class UserRead(UTCModel):
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
    @validator("start_time")
    def start_time_must_be_future(cls, v):
        # Allow a small buffer (e.g. 1 minute) for network latency, or be strict.
        # User said "cannot create a NEW event in the past".
        # Using UTC for comparison. Pydantic often parses as naive if no TZ info, or aware.
        # We should ensure we compare correctly.
        now = datetime.now(timezone.utc)
        if v.tzinfo is None:
            # If naive, assume it's UTC or convert appropriately.
            # Our frontend sends ISO strings which usually parse to aware or we should treat as UTC.
            # If naive, we might assume it's meant to be UTC.
            v_aware = v.replace(tzinfo=timezone.utc)
        else:
            v_aware = v

        if v_aware < now:
             raise ValueError("start_time must be in the future")
        return v

class PollOptionRead(UTCModel):
    id: int
    poll_id: int
    label: str
    start_time: datetime
    end_time: datetime

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
    options: Optional[List[PollOptionCreate]] = None

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

class PollRead(UTCModel):
    id: int
    creator_id: int
    created_at: datetime
    is_recurring: bool
    recurrence_pattern: Optional[str]
    recurrence_end_date: Optional[datetime]
    title: str
    description: Optional[str] = None
    deadline_date: Optional[datetime] = None
    deadline_offset_minutes: Optional[int] = None
    deadline_channel_id: Optional[str] = None
    deadline_message: Optional[str] = None
    deadline_mention_ids: Optional[List[int]] = None
    options: List[PollOptionRead]

class VoteCreate(SQLModel):
    poll_option_id: int

class VoteRead(UTCModel):
    poll_option_id: int
    user: UserRead

class PollOptionReadWithVotes(PollOptionRead):
    votes: List[VoteRead] = []

class PollReadWithDetails(PollRead):
    creator: UserRead
    options: List[PollOptionReadWithVotes]
