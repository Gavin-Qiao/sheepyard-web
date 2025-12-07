from fastapi import APIRouter, Depends, Query
from typing import List
from sqlmodel import Session
from dependencies import get_session, get_current_user
from models import User
from services.mention_service import mention_service

router = APIRouter()

@router.get("/users/ranked", response_model=List[User])
def get_ranked_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Returns users ranked by how recently the current user mentioned them.
    """
    return mention_service.get_ranked_mentions(session, current_user.id)
