from typing import List, Optional
from datetime import datetime
from sqlmodel import Session, select, desc
from models import UserMention, User
from services.discord_service import discord_service
from config import settings

class MentionService:
    def record_mentions(self, session: Session, creator_id: int, target_user_ids: List[int]) -> None:
        """
        Records or updates the last_mentioned_at timestamp for a list of target users
        mentioned by a creator.
        """
        if not target_user_ids:
            return

        now = datetime.utcnow()

        for target_id in target_user_ids:
            # Check if record exists
            statement = select(UserMention).where(
                UserMention.creator_id == creator_id,
                UserMention.target_user_id == target_id
            )
            mention_record = session.exec(statement).first()

            if mention_record:
                mention_record.last_mentioned_at = now
                session.add(mention_record)
            else:
                # Create new record
                new_mention = UserMention(
                    creator_id=creator_id,
                    target_user_id=target_id,
                    last_mentioned_at=now
                )
                session.add(new_mention)

        session.commit()

    def get_ranked_mentions(self, session: Session, creator_id: int) -> List[User]:
        """
        Returns a list of Users ranked by how recently they were mentioned by the creator.
        Users never mentioned are not included? Or included at the end?
        Requirement: "rank all users by most recent @ by the creator in all the events."

        This usually implies we want *all* mentionable users, but sorted.
        However, fetching ALL users might be heavy if thousands.
        For now, let's return:
        1. Users mentioned by creator (sorted desc by date).
        2. Other users (sorted alphabetically or by recent activity).

        Actually, simpler: just return the sorted list of users who HAVE been mentioned.
        The frontend can search/filter from the full list if needed, or we mix them.

        Let's implement: Return ALL users, but order them by Mention History first.
        """

        # Subquery or Join strategy
        # specific for SQLite and SQLModel might be tricky with Outer Joins + Ordering.
        # Let's try to fetch all users and manual sort if N is small (<1000).
        # Assuming Guild size is reasonable.

        # 1. Sync Discord Members
        try:
            guild_members = discord_service.get_guild_members(settings.DISCORD_GUILD_ID)
            for m in guild_members:
                # Check if user exists by Discord ID
                discord_id = str(m["id"])
                existing_user = session.exec(select(User).where(User.discord_id == discord_id)).first()
                
                # Construct Avatar URL
                avatar_url = None
                if m["avatar"]:
                    avatar_url = f"https://cdn.discordapp.com/avatars/{m['id']}/{m['avatar']}.png"

                if existing_user:
                    # Update info if needed (optional, but good for freshness)
                    existing_user.username = m["username"]
                    existing_user.display_name = m["display_name"]
                    existing_user.avatar_url = avatar_url
                    session.add(existing_user)
                else:
                    # Create new user
                    new_user = User(
                        discord_id=discord_id,
                        username=m["username"],
                        display_name=m["display_name"],
                        avatar_url=avatar_url
                    )
                    session.add(new_user)
            session.commit()
        except Exception as e:
            print(f"Error syncing Discord members: {e}")
            # Continue even if sync fails, to show local users at least.

        # 2. Fetch mention history for this creator
        mentions_stmt = select(UserMention).where(UserMention.creator_id == creator_id).order_by(desc(UserMention.last_mentioned_at))
        mentions = session.exec(mentions_stmt).all()

        mention_map = {m.target_user_id: m.last_mentioned_at for m in mentions}

        # 2. Fetch all users
        all_users = session.exec(select(User)).all()

        # 3. Sort
        # Key: (Has been mentioned? [1/0], Last Mention Date, Username)
        # We want most recent first.
        def sort_key(u: User):
            last_at = mention_map.get(u.id)
            # If never mentioned, use min date
            if last_at:
                return (1, last_at.timestamp())
            return (0, 0)

        sorted_users = sorted(all_users, key=sort_key, reverse=True)

        # Filter out the creator themselves?
        # sorted_users = [u for u in sorted_users if u.id != creator_id]

        return sorted_users

mention_service = MentionService()
