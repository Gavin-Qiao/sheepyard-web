from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime, timezone
from pydantic import BaseModel

from dependencies import get_session, get_current_user
from models import User, UserUnavailability

router = APIRouter()

class UnavailabilityCreate(BaseModel):
    start_time: datetime
    end_time: datetime

class UnavailabilityRead(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime

@router.get("/profile/unavailability", response_model=List[UnavailabilityRead])
def get_unavailability(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get all unavailability blocks for the current user.
    """
    return current_user.unavailability

@router.post("/profile/unavailability", response_model=UnavailabilityRead)
def create_unavailability(
    data: UnavailabilityCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new unavailability block, merging with overlapping existing blocks.
    Enforces UTC storage.
    """
    # 1. Normalize to UTC (Naive for DB storage compatibility if needed, but explicit is better)
    start = data.start_time
    end = data.end_time

    if start.tzinfo is not None:
        start = start.astimezone(timezone.utc).replace(tzinfo=None)
    if end.tzinfo is not None:
        end = end.astimezone(timezone.utc).replace(tzinfo=None)

    # Validation: Ensure end_time > start_time
    if end <= start:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    # 2. Find overlapping blocks for this user
    # Overlap if: (ExistingStart <= NewEnd) AND (ExistingEnd >= NewStart)
    statement = select(UserUnavailability).where(
        UserUnavailability.user_id == current_user.id,
        UserUnavailability.start_time <= end,
        UserUnavailability.end_time >= start
    )
    overlapping_blocks = session.exec(statement).all()

    # 3. Merge logic
    final_start = start
    final_end = end

    for block in overlapping_blocks:
        # Normalize block times to naive UTC (assuming they are stored as such) for comparison
        b_start = block.start_time
        b_end = block.end_time
        
        # If DB returns aware (unlikely with basic setup), normalize. 
        # But usually SQLModel/date types return naive.
        
        if b_start < final_start:
            final_start = b_start
        if b_end > final_end:
            final_end = b_end
        
        # Mark old block for deletion
        session.delete(block)

    # 4. Create new merged block
    unavailability = UserUnavailability(
        user_id=current_user.id,
        start_time=final_start,
        end_time=final_end
    )
    session.add(unavailability)
    session.commit()
    session.refresh(unavailability)
    
    # 5. Return with explicit UTC timezone to help frontend
    # Since we stored naive UTC, we attach UTC info so Pydantic serializes it with Z (or +00:00)
    unavailability.start_time = unavailability.start_time.replace(tzinfo=timezone.utc)
    unavailability.end_time = unavailability.end_time.replace(tzinfo=timezone.utc)

    return unavailability

@router.delete("/profile/unavailability/{block_id}")
def delete_unavailability(
    block_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an unavailability block.
    """
    block = session.get(UserUnavailability, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    if block.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this block")

    session.delete(block)
    session.commit()
    return {"ok": True}
