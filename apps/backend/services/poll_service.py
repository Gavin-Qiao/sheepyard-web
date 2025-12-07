from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from models import Poll, PollOption, User, Vote
from schemas import PollCreate, PollOptionCreate, PollUpdate
from services.notification import NotificationService, NoOpNotificationService
import logging
from dateutil import rrule
from dateutil.parser import parse
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class PollService:
    def __init__(self, session: Session, notification_service: NotificationService = NoOpNotificationService()):
        self.session = session
        self.notification_service = notification_service

    def _generate_recurring_options(self, template_option: PollOptionCreate, pattern_str: str, end_date: Optional[datetime], start_date_override: Optional[datetime] = None) -> List[PollOption]:
        """
        Generates a list of PollOptions based on a recurrence pattern.
        """
        if not pattern_str:
            return []

        # Parse the template option to get duration and start time
        start_dt = template_option.start_time
        end_dt = template_option.end_time
        duration = end_dt - start_dt

        # If start_date_override is provided, we use it as the new DTSTART for the series generation
        # This ensures that "modify series from date X" generates the sequence STARTING at X.
        rrule_start = start_date_override if start_date_override else start_dt

        try:
            # Parse RRULE
            rule = rrule.rrulestr(pattern_str, dtstart=rrule_start)

            generated_starts = []

            # Iterator with limit
            MAX_INSTANCES = 365
            count = 0

            for dt in rule:
                if end_date and dt > end_date:
                    break

                generated_starts.append(dt)
                count += 1
                if count >= MAX_INSTANCES:
                    break

            new_options = []
            for dt in generated_starts:
                new_options.append(PollOption(
                    label=dt.strftime("%a, %b %d"), # Simple label
                    start_time=dt,
                    end_time=dt + duration
                ))

            return new_options

        except Exception as e:
            logger.error(f"Failed to parse recurrence rule: {e}")
            return []

    def create_poll(self, poll_create: PollCreate, user: User) -> Poll:
        # Create Poll instance
        db_poll = Poll(
            title=poll_create.title,
            description=poll_create.description,
            creator_id=user.id,
            is_recurring=poll_create.is_recurring,
            recurrence_pattern=poll_create.recurrence_pattern,
            recurrence_end_date=poll_create.recurrence_end_date,

            # Deadline fields
            deadline_date=poll_create.deadline_date,
            deadline_offset_minutes=poll_create.deadline_offset_minutes,
            deadline_channel_id=poll_create.deadline_channel_id,
            deadline_message=poll_create.deadline_message,
            deadline_mention_ids=poll_create.deadline_mention_ids
        )
        # Don't add to session yet, wait for options.

        options = []

        if poll_create.is_recurring and poll_create.recurrence_pattern:
            # Generate options based on the first option as template
            if not poll_create.options:
                 raise HTTPException(status_code=400, detail="Recurring poll needs a template option")

            template = poll_create.options[0]
            generated_options = self._generate_recurring_options(
                template,
                poll_create.recurrence_pattern,
                poll_create.recurrence_end_date
            )

            if not generated_options:
                 if not poll_create.options:
                     raise HTTPException(status_code=400, detail="Failed to generate recurring options")
                 for opt in poll_create.options:
                    options.append(PollOption(
                        label=opt.label, start_time=opt.start_time, end_time=opt.end_time
                    ))
            else:
                options = generated_options
        else:
            # Normal flow
            for option in poll_create.options:
                db_option = PollOption(
                    label=option.label,
                    start_time=option.start_time,
                    end_time=option.end_time
                )
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
        statement = select(Poll).options(
            selectinload(Poll.options).selectinload(PollOption.votes).selectinload(Vote.user),
            selectinload(Poll.creator)
        )
        return self.session.exec(statement).all()

    def add_poll_option(self, poll_id: int, option_create: PollOptionCreate, user: User) -> PollOption:
        poll = self.get_poll(poll_id)
        if poll.creator_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this poll")

        db_option = PollOption(
            poll_id=poll_id,
            label=option_create.label,
            start_time=option_create.start_time,
            end_time=option_create.end_time
        )
        self.session.add(db_option)
        self.session.commit()
        self.session.refresh(db_option)
        return db_option

    def delete_poll(self, poll_id: int, user: User):
        poll = self.get_poll(poll_id)
        if poll.creator_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this poll")

        self.session.delete(poll)
        self.session.commit()

    def update_poll(self, poll_id: int, poll_update: PollUpdate, user: User) -> Poll:
        poll = self.get_poll(poll_id)
        if poll.creator_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this poll")

        poll.title = poll_update.title
        poll.description = poll_update.description

        # Update deadline fields
        if poll_update.deadline_date: poll.deadline_date = poll_update.deadline_date
        if poll_update.deadline_offset_minutes: poll.deadline_offset_minutes = poll_update.deadline_offset_minutes
        if poll_update.deadline_channel_id: poll.deadline_channel_id = poll_update.deadline_channel_id
        if poll_update.deadline_message: poll.deadline_message = poll_update.deadline_message
        if poll_update.deadline_mention_ids: poll.deadline_mention_ids = poll_update.deadline_mention_ids

        # Handle Series Update
        if poll_update.recurrence_pattern and poll_update.apply_changes_from:
            # User wants to modify the series from this date
            cutoff = poll_update.apply_changes_from

            # Update poll recurrence metadata
            poll.is_recurring = True
            poll.recurrence_pattern = poll_update.recurrence_pattern
            if poll_update.recurrence_end_date:
                poll.recurrence_end_date = poll_update.recurrence_end_date

            # 1. Delete future options
            # We need to manually query and delete them
            future_options = [opt for opt in poll.options if opt.start_time >= cutoff]
            for opt in future_options:
                self.session.delete(opt)

            # 2. Generate new options
            if poll.options:
                template_opt_model = poll.options[0]
                # Convert to schema-like object
                template = PollOptionCreate(
                    label=template_opt_model.label,
                    start_time=template_opt_model.start_time,
                    end_time=template_opt_model.end_time
                )
            else:
                 template = PollOptionCreate(
                     label="Event",
                     start_time=cutoff,
                     end_time=cutoff + timedelta(hours=1)
                 )

            # Generate new options from cutoff
            new_options_models = self._generate_recurring_options(
                template,
                poll.recurrence_pattern,
                poll.recurrence_end_date,
                start_date_override=cutoff
            )

            # Add new options
            for opt in new_options_models:
                opt.poll_id = poll.id
                self.session.add(opt)

        self.session.add(poll)
        self.session.commit()
        self.session.refresh(poll)
        return poll

    def delete_poll_option(self, poll_id: int, option_id: int, user: User):
        poll = self.get_poll(poll_id)
        if poll.creator_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this poll")

        option = self.session.get(PollOption, option_id)
        if not option:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")

        if option.poll_id != poll_id:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Option does not belong to this poll")

        self.session.delete(option)
        self.session.commit()
