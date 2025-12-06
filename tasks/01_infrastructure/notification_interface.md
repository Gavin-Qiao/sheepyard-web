# Task: Define Notification Interface

## Responsibility
Define a strict, abstract Python interface (protocol) for the application to broadcast events. This task does **not** include the implementation of the actual Discord API calls, but strictly the contract that other modules will use.

## Scope
*   Create a `NotificationService` abstract base class or Protocol.
*   Define methods:
    *   `notify_poll_created(poll_title: str, creator_name: str, poll_id: int)`
    *   `notify_vote_cast(poll_title: str, voter_name: str, option_label: str)`
*   Provide a "No-Op" (dummy) implementation for local development to ensure the app doesn't crash if Discord is unconfigured.

## Dependencies
*   **None.** This is a foundational interface.
