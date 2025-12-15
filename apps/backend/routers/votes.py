from fastapi import APIRouter, Depends
from sqlmodel import Session

from models import User
from schemas import VoteCreate
from dependencies import get_session, get_current_user
from services.vote_service import VoteService
from services.notification import NoOpNotificationService

router = APIRouter()

@router.post("/votes")
async def vote(
    vote_data: VoteCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Toggle a vote for a poll option.
    """
    # Use NoOpNotificationService for now, or inject a real one if configured
    notification_service = NoOpNotificationService()
    vote_service = VoteService(session, notification_service)
    result = vote_service.cast_vote(user, vote_data.poll_option_id)
    return result
