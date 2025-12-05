# Task: Voting Logic Domain

## Responsibility
Implement the business logic for user participation (casting votes). This module is strictly hierarchical, depending entirely on the existence of a Poll.

## Scope
*   **Service Layer (`VoteService`):**
    *   `cast_vote(user_id, poll_option_id)`:
        *   **Validation:** Checks if the `PollOption` exists (queries Poll Domain/DB).
        *   **Logic:** Upserts the vote (or toggle behavior depending on UI reqs).
        *   **Side Effect:** Calls `NotificationService.notify_vote_cast`.
*   **API Layer (`/api/votes`):**
    *   `POST /`: Toggle a vote for an option (Authenticated).
    *   *Note:* Fetching votes should be aggregated in the `Poll` retrieval or a separate `GET /polls/{id}/votes` endpoint.

## Dependencies
*   **Domain/Poll:** Cannot function without a valid Poll ID/Option ID.
*   **Infrastructure/Database:** Requires `Vote` table.
*   **Infrastructure/Notification:** Requires `NotificationService` interface.
