# Task: Poll Management Domain

## Responsibility
Implement the core business logic and API endpoints for creating, retrieving, and managing Polls. This module acts as the "Parent" context for the calendar application.

## Scope
*   **Service Layer (`PollService`):**
    *   `create_poll(user_id, title, options)`: Validates input, saves to DB.
    *   `get_poll(poll_id)`: Retrieves poll details and its options.
    *   `list_polls()`: Returns a list of available polls.
    *   **Side Effect:** Calls `NotificationService.notify_poll_created` upon success.
*   **API Layer (`/api/polls`):**
    *   `POST /`: Create a new poll (Authenticated).
    *   `GET /{id}`: Read specific poll.
    *   `GET /`: List all polls.

## Dependencies
*   **Infrastructure/Database:** Requires `Poll` and `PollOption` tables.
*   **Infrastructure/Notification:** Requires `NotificationService` interface.
*   **User Context:** Requires current authenticated `User` from `auth.py`.
