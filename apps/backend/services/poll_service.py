from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from models import Poll, PollOption, User, Vote
from schemas import PollCreate, PollOptionCreate
from services.notification import NotificationService, NoOpNotificationService
import logging

logger = logging.getLogger(__name__)

class PollService:
    def __init__(self, session: Session, notification_service: NotificationService = NoOpNotificationService()):
        self.session = session
        self.notification_service = notification_service

    def create_poll(self, poll_create: PollCreate, user: User) -> Poll:
        # Create Poll instance
        db_poll = Poll(
            title=poll_create.title,
            description=poll_create.description,
            creator_id=user.id
        )
        self.session.add(db_poll)

        # We need to flush to get the poll ID, OR we can rely on SQLAlchemy to handle relationships if we add options to the poll directly.
        # But since PollOption has a foreign key `poll_id`, we can instantiate them with the relationship object if we want,
        # or just add them to the session and let the flush handle it if we link them.
        # However, SQLModel/SQLAlchemy is smarter.

        # Method 1: Flush to get ID, then add options.
        # Method 2: Use relationship. db_poll.options = [PollOption(...)]

        # Let's use Method 2 for cleaner code and atomicity.

        options = []
        for option in poll_create.options:
            db_option = PollOption(
                label=option.label,
                start_time=option.start_time,
                end_time=option.end_time
            )
            # Link via relationship or we wait for db_poll.id
            # If we append to db_poll.options, SQLAlchemy handles the FK.
            options.append(db_option)

        db_poll.options = options

        self.session.add(db_poll)
        self.session.commit()
        self.session.refresh(db_poll)

        # Send notification
        try:
            creator_name = user.display_name or user.username
            self.notification_service.notify_poll_created(
                poll_title=db_poll.title,
                creator_name=creator_name,
                poll_id=db_poll.id
            )
        except Exception as e:
            logger.error(f"Failed to send poll creation notification: {e}")

        return db_poll

    def get_poll(self, poll_id: int) -> Poll:
        # Eager load options to avoid N+1 and ensure they are present
        statement = select(Poll).where(Poll.id == poll_id).options(
            selectinload(Poll.options).selectinload(PollOption.votes).selectinload(Vote.user),
            selectinload(Poll.creator)
        )
        poll = self.session.exec(statement).first()
        if not poll:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poll not found")
        return poll

    def list_polls(self) -> List[Poll]:
        # Eager load options
        statement = select(Poll).options(selectinload(Poll.options))
        return self.session.exec(statement).all()
