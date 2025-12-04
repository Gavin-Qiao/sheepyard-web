# Development Setup Guide

## Prerequisites

1.  **Discord Application**:
    -   Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    -   Create a new Application.
    -   Go to the **OAuth2** tab.
    -   Add `http://localhost:5173/api/auth/callback` to the **Redirects**.
    -   Copy the `Client ID` and `Client Secret`.

2.  **Discord Guild (Server)**:
    -   Enable "Developer Mode" in your Discord User Settings > Advanced.
    -   Right-click your server and click "Copy ID". This is your `DISCORD_GUILD_ID`.

## Environment Variables

1.  Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Fill in the values in `.env` with the credentials obtained above.
    -   Generate a random string for `SECRET_KEY` (e.g., `openssl rand -hex 32`).

## Running the Application

This project is a monorepo. You need to run both the backend and frontend.

### Backend

1.  Navigate to `apps/backend`:
    ```bash
    cd apps/backend
    ```
2.  Install dependencies (if not already installed via devcontainer):
    ```bash
    uv sync
    ```
3.  Run the server:
    ```bash
    uv run uvicorn main:app --reload
    ```

### Frontend

1.  Navigate to `apps/frontend`:
    ```bash
    cd apps/frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the dev server:
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:5173`.
