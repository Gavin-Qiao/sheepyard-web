from fastapi import APIRouter, Depends
from sqlmodel import Session
from typing import List

from models import User
from schemas import PollCreate, PollRead, PollReadWithDetails
from dependencies import get_session, get_current_user
from services.poll_service import PollService
from services.notification import NoOpNotificationService

router = APIRouter()

@router.get("/polls", response_model=List[PollRead])
def list_polls(
    session: Session = Depends(get_session)
):
    """
    List all polls.
    """
    poll_service = PollService(session)
    return poll_service.list_polls()

@router.post("/polls", response_model=PollRead)
def create_poll(
    poll_data: PollCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a new poll.
    """
    notification_service = NoOpNotificationService()
    poll_service = PollService(session, notification_service)
    return poll_service.create_poll(poll_data, user)

@router.get("/polls/{poll_id}", response_model=PollReadWithDetails)
def get_poll(
    poll_id: int,
    session: Session = Depends(get_session)
):
    """
    Get a poll by ID.
    """
    poll_service = PollService(session)
    return poll_service.get_poll(poll_id)
