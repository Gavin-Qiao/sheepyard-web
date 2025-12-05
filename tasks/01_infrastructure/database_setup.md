# Task: Database Schema & Migration

## Responsibility
Design and apply the database schema required to store Polls and Votes using the existing SQLite infrastructure.

## Scope
*   **Database Models (SQLModel):**
    *   `Poll`: `id`, `title`, `description`, `creator_id` (FK to User), `created_at`.
    *   `PollOption`: `id`, `poll_id` (FK to Poll), `start_time` (datetime), `end_time` (datetime).
    *   `Vote`: `id`, `poll_option_id` (FK to PollOption), `user_id` (FK to User), `created_at`.
*   **Migration Strategy:**
    *   Write the raw SQL `CREATE TABLE IF NOT EXISTS` statements.
    *   Inject these statements into `apps/backend/main.py` startup logic (following existing pattern).

## Dependencies
*   Existing `User` model (`apps/backend/models.py`).
*   Existing `database.py` connection setup.
