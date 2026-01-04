from typing import Optional
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status, BackgroundTasks
from models import Vote, PollOption, User, Poll
from services.notification import NotificationService, NoOpNotificationService
from services.poll_service import PollService
import logging
import asyncio

logger = logging.getLogger(__name__)

class VoteService:
    def __init__(self, session: Session, poll_service: PollService, notification_service: NotificationService = NoOpNotificationService()):
        self.session = session
        self.poll_service = poll_service
        self.notification_service = notification_service


    def cast_vote(self, user: User, poll_option_id: int, background_tasks: BackgroundTasks) -> dict:
        """
        Toggles a vote for a specific poll option.
        If the vote exists, it removes it.
        If the vote does not exist, it creates it.
        """
        # 1. Verify Poll Option exists and fetch poll info for notification
        statement = select(PollOption).where(PollOption.id == poll_option_id).options(selectinload(PollOption.poll))
        poll_option = self.session.exec(statement).first()

        if not poll_option:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poll option not found")

        # 2. Check for existing vote
        vote_statement = select(Vote).where(
            Vote.poll_option_id == poll_option_id,
            Vote.user_id == user.id
        )
        existing_vote = self.session.exec(vote_statement).first()

        poll_id = poll_option.poll_id

        if existing_vote:
            # Toggle OFF: Delete vote
            self.session.delete(existing_vote)
            self.session.commit()

            # Broadcast
            background_tasks.add_task(self.poll_service.broadcast_poll_update, poll_id)

            return {"status": "removed", "poll_option_id": poll_option_id}
        else:
            # Toggle ON: Create vote
            new_vote = Vote(poll_option_id=poll_option_id, user_id=user.id)
            self.session.add(new_vote)
            self.session.commit()
            self.session.refresh(new_vote)

            # Broadcast
            background_tasks.add_task(self.poll_service.broadcast_poll_update, poll_id)

            # Notify
            try:
                # Assuming PollOption has a relationship to Poll named 'poll'
                poll_title = poll_option.poll.title if poll_option.poll else "Unknown Poll"
                voter_name = user.display_name or user.username

                self.notification_service.notify_vote_cast(
                    poll_title=poll_title,
                    voter_name=voter_name,
                    option_label=poll_option.label
                )
            except Exception as e:
                logger.error(f"Failed to send vote notification: {e}")

            return {"status": "added", "poll_option_id": poll_option_id}
