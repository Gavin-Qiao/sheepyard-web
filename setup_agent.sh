#!/bin/bash
set -e

echo "Starting environment setup..."

# 1. Setup Backend
echo "Setting up Backend..."
cd apps/backend

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating dummy .env file..."
    cat > .env <<EOF
DISCORD_CLIENT_ID=mock_client_id
DISCORD_CLIENT_SECRET=mock_client_secret
DISCORD_REDIRECT_URI=http://localhost:5173/api/auth/callback
DISCORD_GUILD_ID=mock_guild_id
SECRET_KEY=supersecretkeyForDevelopmentOnly123
FRONTEND_URL=http://localhost:5173
DB_PATH=./app.db
EOF
else
    echo ".env already exists, skipping creation."
fi

# Install dependencies
echo "Installing backend dependencies with uv..."
uv sync

# Initialize Database
echo "Initializing database..."
# We use 'uv run' to ensure we use the venv and dependencies.
uv run python -c "from main import create_db_and_tables; create_db_and_tables()"

cd ../..

# 2. Setup Frontend
echo "Setting up Frontend..."
cd apps/frontend

echo "Installing frontend dependencies with npm..."
npm install

echo "Setup complete!"
