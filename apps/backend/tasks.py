import asyncio
from datetime import datetime, timedelta
from sqlmodel import Session, select
from database import engine
from models import Poll, PollOption, Vote, User
from services.discord_service import discord_service
from services.mention_service import mention_service
from config import settings

async def check_deadlines():
    """
    Background task to check for expired deadlines and send notifications.
    """
    print("Starting deadline checker task...")
    while True:
        try:
            with Session(engine) as session:
                now = datetime.utcnow()

                # 1. Check One-Time Polls
                stmt_onetime = select(Poll).where(
                    Poll.deadline_date != None,
                    Poll.deadline_date <= now,
                    Poll.deadline_notification_sent == False,
                    Poll.is_recurring == False
                )
                expired_onetime_polls = session.exec(stmt_onetime).all()

                for poll in expired_onetime_polls:
                    print(f"Processing deadline for one-time poll: {poll.title}")
                    process_onetime_poll(session, poll)

                # 2. Check Recurring Polls
                stmt_recurring = select(Poll).where(
                    Poll.is_recurring == True,
                    Poll.deadline_offset_minutes != None
                )
                recurring_polls = session.exec(stmt_recurring).all()

                for poll in recurring_polls:
                    offset = timedelta(minutes=poll.deadline_offset_minutes)
                    options_stmt = select(PollOption).where(
                        PollOption.poll_id == poll.id,
                        PollOption.notification_sent == False,
                        (PollOption.start_time - offset) <= now
                    )
                    options = session.exec(options_stmt).all()

                    for option in options:
                        trigger_time = option.start_time - offset
                        if now - trigger_time < timedelta(hours=6):
                             print(f"Processing deadline for recurring poll: {poll.title}, option: {option.start_time}")
                             process_recurring_instance(session, poll, option)
                        else:
                            option.notification_sent = True
                            session.add(option)
                            session.commit()

            await asyncio.sleep(60)

        except Exception as e:
            print(f"Error in deadline checker: {e}")
            await asyncio.sleep(60)

def process_onetime_poll(session: Session, poll: Poll):
    try:
        if not poll.deadline_channel_id:
            return

        # 1. Determine Winner
        options = poll.options
        if not options:
            result_text = "No options were available."
        else:
            scores = []
            for opt in options:
                count = len(opt.votes)
                scores.append((opt, count))
            scores.sort(key=lambda x: x[1], reverse=True)

            if not scores or scores[0][1] == 0:
                 result_text = "No votes were cast."
            else:
                 winner, count = scores[0]
                 max_score = scores[0][1]
                 ties = [s[0] for s in scores if s[1] == max_score]

                 import random
                 final_winner = random.choice(ties)
                 result_text = f"Winner: **{final_winner.label}** ({max_score} votes)"

        # 2. Collect Mentions
        voter_ids = set()
        for opt in poll.options:
            for vote in opt.votes:
                voter_ids.add(vote.user_id)

        # Manually mentioned users
        manual_mentions = []
        if poll.deadline_mention_ids:
            import json
            manual_ids = poll.deadline_mention_ids
            if isinstance(manual_ids, str):
                 try:
                     manual_ids = json.loads(manual_ids)
                 except:
                     manual_ids = []
            if isinstance(manual_ids, list):
                manual_mentions = manual_ids
                for uid in manual_ids:
                    voter_ids.add(uid)

        # Record Mentions for Ranking
        # Users mentioned in the final deadline message (manually) should be boosted.
        if manual_mentions:
            mention_service.record_mentions(session, poll.creator_id, manual_mentions)

        discord_ids = []
        if voter_ids:
            users = session.exec(select(User).where(User.id.in_(list(voter_ids)))).all()
            discord_ids = [u.discord_id for u in users]

        # 3. Send Notification
        event_url = f"{settings.FRONTEND_URL}/apps/calendar/events/{poll.id}"

        discord_service.send_deadline_notification(
            channel_id=poll.deadline_channel_id,
            poll_title=poll.title,
            event_url=event_url,
            message=poll.deadline_message,
            result_text=result_text,
            mention_discord_ids=discord_ids
        )

        # 4. Mark as Sent
        poll.deadline_notification_sent = True
        session.add(poll)
        session.commit()

    except Exception as e:
        print(f"Failed to process onetime poll {poll.id}: {e}")

def process_recurring_instance(session: Session, poll: Poll, option: PollOption):
    try:
        if not poll.deadline_channel_id:
            return

        # 1. Participants List
        participants = []
        voter_ids = set()

        for vote in option.votes:
            voter_ids.add(vote.user_id)
            user = vote.user
            name = user.display_name or user.username
            participants.append(name)

        if not participants:
            result_text = "No participants yet."
        else:
            result_text = "**Participants:** " + ", ".join(participants)

        # 2. Mentions
        manual_mentions = []
        if poll.deadline_mention_ids:
             import json
             manual_ids = poll.deadline_mention_ids
             if isinstance(manual_ids, str):
                  try:
                      manual_ids = json.loads(manual_ids)
                  except:
                      manual_ids = []
             if isinstance(manual_ids, list):
                 manual_mentions = manual_ids
                 for uid in manual_ids:
                     voter_ids.add(uid)

        if manual_mentions:
            mention_service.record_mentions(session, poll.creator_id, manual_mentions)

        discord_ids = []
        if voter_ids:
             users = session.exec(select(User).where(User.id.in_(list(voter_ids)))).all()
             discord_ids = [u.discord_id for u in users]

        # 3. Send Notification
        event_url = f"{settings.FRONTEND_URL}/apps/calendar/events/{poll.id}"

        # Use Discord's native timestamp formatting for proper timezone display
        from datetime import timezone as tz
        start_dt = option.start_time
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=tz.utc)
        start_timestamp = int(start_dt.timestamp())
        date_label = f"<t:{start_timestamp}:f>"

        discord_service.send_deadline_notification(
            channel_id=poll.deadline_channel_id,
            poll_title=f"{poll.title} ({date_label})",
            event_url=event_url,
            message=poll.deadline_message,
            result_text=result_text,
            mention_discord_ids=discord_ids
        )

        # 4. Mark as Sent
        option.notification_sent = True
        session.add(option)
        session.commit()

    except Exception as e:
        print(f"Failed to process recurring poll {poll.id} instance {option.id}: {e}")
