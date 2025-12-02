# Development Environment Setup

This project uses Docker Compose for development.

## Environment Variables

The backend requires the following environment variables to be set for Discord Authentication to work.
You can set these in a `.env` file in the `apps/backend` directory or pass them to docker-compose.

**Required:**

*   `DISCORD_CLIENT_ID`: Your Discord Application Client ID.
*   `DISCORD_CLIENT_SECRET`: Your Discord Application Client Secret.
*   `DISCORD_REDIRECT_URI`: The callback URL. For local dev, this is typically `http://localhost:80/api/auth/callback`.
*   `DISCORD_GUILD_ID`: (Optional but recommended) The ID of the Discord server (guild) required for login.
*   `SECRET_KEY`: A secret key for JWT signing.

**Example `.env` content:**

```bash
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=your_secret_here
DISCORD_REDIRECT_URI=http://localhost:80/api/auth/callback
DISCORD_GUILD_ID=your_guild_id_here
SECRET_KEY=super_secret_key_change_me
```

## Database

The database is SQLite and is located at `./data/app.db` relative to the project root.
This is mapped via a bind mount in `docker-compose.yml`.

## Running the Project

```bash
docker-compose up --build
```

Access the frontend at `http://localhost`.
The backend API is available at `http://localhost/api`.
