from fastapi import APIRouter, Depends, BackgroundTasks
from sqlmodel import Session

from models import User
from schemas import VoteCreate
from dependencies import get_session, get_current_user, get_connection_manager
from managers.connection_manager import ConnectionManager
from services.vote_service import VoteService
from services.poll_service import PollService
from services.notification import NoOpNotificationService

router = APIRouter()

@router.post("/votes")
async def vote(
    vote_data: VoteCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    connection_manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    Toggle a vote for a poll option.
    """
    # Use NoOpNotificationService for now, or inject a real one if configured
    notification_service = NoOpNotificationService()
    poll_service = PollService(session, connection_manager)
    vote_service = VoteService(session, poll_service, notification_service)
    result = vote_service.cast_vote(user, vote_data.poll_option_id, background_tasks)
    return result
