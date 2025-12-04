# Task: Frontend Calendar Application

## Responsibility
Construct the user interface for the Calendar App within the existing React dashboard, strictly adhering to the "Chinese Ethereal" aesthetic.

## Scope
*   **Routing:**
    *   Create route `/apps/calendar`.
    *   Update `Dashboard.tsx` to link to this route.
*   **Components:**
    *   `PollList`: Displays active polls in a grid/list.
    *   `PollCreate`: A form to input Title and select multiple dates (using a date picker compatible with the aesthetic).
    *   `PollDetail`: A "Doodle-like" table view:
        *   Columns: Date Options.
        *   Rows: Users.
        *   Cells: Checkmarks/Votes.
*   **Integration:**
    *   Fetch data from `/api/polls`.
    *   Post data to `/api/votes`.

## Dependencies
*   **Backend API:** Requires functioning `Poll` and `Vote` endpoints.
*   **Design System:** Must use `tailwind-merge`, `clsx`, and existing color palette (Jade, Mist, Paper).
