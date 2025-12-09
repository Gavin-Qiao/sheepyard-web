from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime
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
    Create a new unavailability block.
    """
    # Validation: Ensure end_time > start_time
    if data.end_time <= data.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    unavailability = UserUnavailability(
        user_id=current_user.id,
        start_time=data.start_time,
        end_time=data.end_time
    )
    session.add(unavailability)
    session.commit()
    session.refresh(unavailability)
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
