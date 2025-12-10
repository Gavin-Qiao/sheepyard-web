import httpx
from typing import List, Dict, Optional
from datetime import datetime
from config import settings
from models import Poll, User

class DiscordService:
    BASE_URL = "https://discord.com/api/v10"

    def __init__(self):
        self.headers = {
            "Authorization": f"Bot {settings.DISCORD_BOT_TOKEN}",
            "Content-Type": "application/json"
        }

    def get_guild_channels(self, guild_id: str) -> List[Dict]:
        """
        Fetches all channels for a guild and filters for text channels.
        """
        url = f"{self.BASE_URL}/guilds/{guild_id}/channels"

        try:
            with httpx.Client() as client:
                response = client.get(url, headers=self.headers)
                response.raise_for_status()
                channels = response.json()
                text_channels = [
                    {"id": c["id"], "name": c["name"], "position": c.get("position", 0), "parent_id": c.get("parent_id")}
                    for c in channels
                    if c.get("type") == 0
                ]
                text_channels.sort(key=lambda x: x["position"])
                return text_channels
        except httpx.HTTPStatusError as e:
            print(f"Discord API Error: {e.response.text}")
            raise e
        except Exception as e:
            print(f"Error fetching channels: {e}")
            raise e

    def get_guild_members(self, guild_id: str) -> List[Dict]:
        """
        Fetches members from the guild.
        """
        url = f"{self.BASE_URL}/guilds/{guild_id}/members"
        params = {"limit": 1000}

        try:
            with httpx.Client() as client:
                response = client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                members = response.json()
                
                formatted_members = []
                for m in members:
                    user = m.get("user", {})
                    if user.get("bot"): continue
                    
                    display_name = m.get("nick") or user.get("global_name") or user.get("username")
                    formatted_members.append({
                        "id": user.get("id"),
                        "username": user.get("username"),
                        "display_name": display_name,
                        "avatar": user.get("avatar")
                    })
                
                return formatted_members

        except httpx.HTTPStatusError as e:
            print(f"Discord API Error: {e.response.text}")
            raise e
        except Exception as e:
            print(f"Error fetching members: {e}")
            raise e

    def get_guild_member(self, guild_id: str, user_id: str) -> Optional[Dict]:
        """
        Fetches a single member from the guild.
        """
        url = f"{self.BASE_URL}/guilds/{guild_id}/members/{user_id}"

        try:
            with httpx.Client() as client:
                response = client.get(url, headers=self.headers)
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print(f"Error fetching member {user_id}: {e}")
            return None

    def send_poll_share_message(self, channel_id: str, poll: Poll, creator: User, frontend_url: str, custom_message: Optional[str] = None, mentioned_user_ids: Optional[List[int]] = None, db_session = None) -> Dict:
        """
        Sends a rich embed message to the specified Discord channel.
        """
        url = f"{self.BASE_URL}/channels/{channel_id}/messages"

        # Construct Event Link
        event_link = f"{frontend_url.rstrip('/')}/apps/calendar/{poll.id}"

        description = poll.description
        if description and len(description) > 200:
             description = description[:197] + "..."

        fields = [
             {
                "name": "Organized by",
                "value": creator.display_name or creator.username,
                "inline": False
            }
        ]

        # Add Time info using Discord's native timestamp formatting
        # Discord timestamps automatically display in each user's local timezone
        if poll.options:
             sorted_options = sorted(poll.options, key=lambda x: x.start_time)
             first_option = sorted_options[0]
             
             # Convert naive UTC datetime to Unix timestamp
             # The datetime is stored as naive UTC, so we interpret it as UTC
             from datetime import timezone as tz
             start_dt = first_option.start_time
             if start_dt.tzinfo is None:
                 start_dt = start_dt.replace(tzinfo=tz.utc)
             start_timestamp = int(start_dt.timestamp())
             
             end_dt = first_option.end_time
             if end_dt.tzinfo is None:
                 end_dt = end_dt.replace(tzinfo=tz.utc)
             end_timestamp = int(end_dt.timestamp())

             if poll.is_recurring:
                  # Use 'f' format: "November 28, 2024 9:01 AM"
                  time_value = f"Starts <t:{start_timestamp}:f> (Recurring)"
             else:
                  # Show full date and time for start, just time for end
                  # 'f' = full date and time, 't' = short time
                  time_value = f"<t:{start_timestamp}:f> - <t:{end_timestamp}:t>"

             fields.insert(0, {
                 "name": "When",
                 "value": time_value,
                 "inline": False
             })

        embed = {
            "title": f"📅 {poll.title}",
            "description": description or "",
            "url": event_link,
            "color": 0x00A86B,  # Jade color
            "fields": fields,
            "thumbnail": {
                "url": creator.avatar_url or ""
            },
            "footer": {
                "text": "SheepYard Calendar",
                "icon_url": "https://cdn.discordapp.com/emojis/123456789.png"  # Placeholder or ideally app icon
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        # Handle mentions
        content = custom_message if custom_message else "**New Event Shared!**"

        mention_str = ""
        if mentioned_user_ids and db_session:
            # Need to fetch discord IDs for these user IDs
            from models import User # lazy import
            users = db_session.query(User).filter(User.id.in_(mentioned_user_ids)).all()
            mentions = [f"<@{u.discord_id}>" for u in users]
            if mentions:
                mention_str = " ".join(mentions)

        if mention_str:
            content = f"{content}\n\n{mention_str}"

        payload = {
            "content": content,
            "embeds": [embed]
        }

        try:
            with httpx.Client() as client:
                response = client.post(url, headers=self.headers, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            print(f"Discord API Error: {e.response.text}")
            raise e
        except Exception as e:
            print(f"Error sending message: {e}")
            raise e

    def send_deadline_notification(self, channel_id: str, poll_title: str, event_url: str, message: str, result_text: str, mention_discord_ids: List[str]) -> None:
        """
        Sends the final deadline notification.
        """
        url = f"{self.BASE_URL}/channels/{channel_id}/messages"

        fields = [
            {
                "name": "Result / Status",
                "value": result_text,
                "inline": False
            }
        ]

        embed = {
            "title": f"⏰ Deadline Reached: {poll_title}",
            "description": message or "The deadline for this event has passed.",
            "url": event_url,
            "color": 0xff5555, # Redish for deadline
            "fields": fields,
            "footer": {
                "text": "SheepYard Calendar"
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        content = ""
        if mention_discord_ids:
            content = " ".join([f"<@{uid}>" for uid in mention_discord_ids])

        payload = {
            "content": content,
            "embeds": [embed]
        }

        try:
            with httpx.Client() as client:
                client.post(url, headers=self.headers, json=payload)
        except Exception as e:
            print(f"Error sending deadline notification: {e}")

    def send_profile_share_message(self, channel_id: str, file_owner: User, frontend_url: str, custom_message: Optional[str] = None, mentioned_user_ids: Optional[List[int]] = None, db_session = None) -> Dict:
        """
        Sends a share message for a user's availability profile.
        """
        url = f"{self.BASE_URL}/channels/{channel_id}/messages"

        # Link to home page or specific profile route if it existed
        # Since Profile.tsx is "Your Profile" and edits it, and we assume there isn't a public read-only view yet or it's just the main app.
        # We will link to the app root for now.
        profile_link = f"{frontend_url.rstrip('/')}/" 

        fields = [
             {
                "name": "User",
                "value": file_owner.display_name or file_owner.username,
                "inline": True
            },
            {
                "name": "Action",
                "value": "Shared their Unavailability Schedule",
                "inline": True
            }
        ]

        embed = {
            "title": f"📅 Availability Update",
            "description": f"Check out **{file_owner.display_name or file_owner.username}**'s availability!",
            "url": profile_link,
            "color": 0x00A86B,  # Jade color
            "fields": fields,
            "thumbnail": {
                "url": file_owner.avatar_url or ""
            },
            "footer": {
                "text": "SheepYard Calendar",
                "icon_url": "https://cdn.discordapp.com/emojis/123456789.png" 
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        # Handle mentions
        content = custom_message if custom_message else "**Availability Shared!**"

        mention_str = ""
        if mentioned_user_ids and db_session:
            from models import User # lazy import
            users = db_session.query(User).filter(User.id.in_(mentioned_user_ids)).all()
            mentions = [f"<@{u.discord_id}>" for u in users]
            if mentions:
                mention_str = " ".join(mentions)

        if mention_str:
            content = f"{content}\n\n{mention_str}"

        payload = {
            "content": content,
            "embeds": [embed]
        }

        try:
            with httpx.Client() as client:
                response = client.post(url, headers=self.headers, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            print(f"Discord API Error: {e.response.text}")
            raise e
        except Exception as e:
            print(f"Error sending message: {e}")
            raise e

discord_service = DiscordService()
