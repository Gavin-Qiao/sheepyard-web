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
                # Filter for Text Channels (type 0)
                # Sort by position is nice but not strictly required, Discord API usually returns them unordered.
                # We return id, name, and position to help sorting on frontend if needed.
                text_channels = [
                    {"id": c["id"], "name": c["name"], "position": c.get("position", 0), "parent_id": c.get("parent_id")}
                    for c in channels
                    if c.get("type") == 0
                ]
                # Sort by position
                text_channels.sort(key=lambda x: x["position"])
                return text_channels
        except httpx.HTTPStatusError as e:
            print(f"Discord API Error: {e.response.text}")
            raise e
        except Exception as e:
            print(f"Error fetching channels: {e}")
            raise e

    def send_poll_share_message(self, channel_id: str, poll: Poll, creator: User, frontend_url: str) -> Dict:
        """
        Sends a rich embed message to the specified Discord channel.
        """
        url = f"{self.BASE_URL}/channels/{channel_id}/messages"

        # Construct Event Link
        # Assuming the frontend route is /apps/calendar/events/:id
        # We might need to adjust based on actual routing.
        # Looking at PollDetail.tsx, it uses /apps/calendar/events/:pollId implicitly or similar?
        # The user didn't specify the exact URL structure but based on "When a user creates a new event... share it...".
        # I'll use the base FRONTEND_URL + /apps/calendar/events/{poll.id} as a safe guess.
        # Actually, let's check how the frontend routes are defined.
        # But for now, I'll stick to a standard pattern.
        event_link = f"{frontend_url}/apps/calendar/events/{poll.id}"

        description = poll.description
        if description and len(description) > 200:
             description = description[:197] + "..."

        fields = [
             {
                "name": "Organized by",
                "value": creator.display_name or creator.username,
                "inline": True
            }
        ]

        # Add Time info
        if poll.options:
             # Sort options by start_time just in case
             sorted_options = sorted(poll.options, key=lambda x: x.start_time)
             first_option = sorted_options[0]

             # Format date
             start_str = first_option.start_time.strftime("%a, %b %d @ %H:%M")

             if poll.is_recurring:
                  time_value = f"Starts {start_str} (Recurring)"
             else:
                  end_str = first_option.end_time.strftime("%H:%M")
                  time_value = f"{start_str} - {end_str}"

             fields.insert(0, {
                 "name": "When",
                 "value": time_value,
                 "inline": True
             })

        embed = {
            "title": f"📅 {poll.title}",
            "description": description or "",
            "url": event_link,
            "color": 0x4ade80, # Jade-like color
            "fields": fields,
            "footer": {
                "text": "SheepYard Calendar"
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        payload = {
            "content": f"**New Event Shared!**",
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
