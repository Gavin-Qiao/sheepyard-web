from typing import Protocol

class NotificationService(Protocol):
    """
    Abstract interface for notification services.
    """
    def notify_poll_created(self, poll_title: str, creator_name: str, poll_id: int) -> None:
        """
        Notify that a new poll has been created.
        """
        ...

    def notify_vote_cast(self, poll_title: str, voter_name: str, option_label: str) -> None:
        """
        Notify that a vote has been cast.
        """
        ...

class NoOpNotificationService:
    """
    A no-operation notification service for local development.
    Prints notifications to standard output.
    """
    def notify_poll_created(self, poll_title: str, creator_name: str, poll_id: int) -> None:
        print(f"[NOTIFICATION] New Poll Created: '{poll_title}' by {creator_name} (ID: {poll_id})")

    def notify_vote_cast(self, poll_title: str, voter_name: str, option_label: str) -> None:
        print(f"[NOTIFICATION] Vote Cast: {voter_name} voted for '{option_label}' in poll '{poll_title}'")
