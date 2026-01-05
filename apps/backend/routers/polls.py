from fastapi import APIRouter, Depends, BackgroundTasks
from sqlmodel import Session
from typing import List

from models import User
from schemas import PollCreate, PollRead, PollReadWithDetails, PollUpdate, PollOptionCreate, PollOptionRead
from services.poll_service import PollService
from services.notification import NoOpNotificationService
from managers.connection_manager import ConnectionManager
from dependencies import get_session, get_current_user, get_connection_manager

router = APIRouter()

@router.get("/polls", response_model=List[PollReadWithDetails])
def list_polls(
    session: Session = Depends(get_session),
    connection_manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    List all polls with details.
    """
    poll_service = PollService(session, connection_manager)
    return poll_service.list_polls()

@router.post("/polls", response_model=PollRead)
def create_poll(
    poll_data: PollCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    connection_manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    Create a new poll.
    """
    notification_service = NoOpNotificationService()
    poll_service = PollService(session, connection_manager, notification_service)
    return poll_service.create_poll(poll_data, user)

@router.get("/polls/{poll_id}", response_model=PollReadWithDetails)
def get_poll(
    poll_id: int,
    session: Session = Depends(get_session),
    connection_manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    Get a poll by ID.
    """
    poll_service = PollService(session, connection_manager)
    return poll_service.get_poll(poll_id)

@router.put("/polls/{poll_id}", response_model=PollRead)
def update_poll(
    poll_id: int,
    poll_update: PollUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    connection_manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    Update a poll's title and description.
    """
    poll_service = PollService(session, connection_manager)
    return poll_service.update_poll(poll_id, poll_update, user, background_tasks)

@router.delete("/polls/{poll_id}")
def delete_poll(
    poll_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    connection_manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    Delete a poll.
    """
    poll_service = PollService(session, connection_manager)
    poll_service.delete_poll(poll_id, user, background_tasks)
    return {"ok": True}

@router.post("/polls/{poll_id}/options", response_model=PollOptionRead)
def add_poll_option(
    poll_id: int,
    option_data: PollOptionCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    connection_manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    Add a new option to a poll.
    """
    poll_service = PollService(session, connection_manager)
    return poll_service.add_poll_option(poll_id, option_data, user, background_tasks)

@router.delete("/polls/{poll_id}/options/{option_id}")
def delete_poll_option(
    poll_id: int,
    option_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    connection_manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    Delete a poll option.
    """
    poll_service = PollService(session, connection_manager)
    poll_service.delete_poll_option(poll_id, option_id, user, background_tasks)
    return {"ok": True}
