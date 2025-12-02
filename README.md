# SheepYard Community Platform

A lightweight web platform built for the SheepYard community (15 users).

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Python FastAPI
- **Database**: SQLite
- **Infrastructure**: Docker Compose, Caddy (Reverse Proxy & SSL)

## Getting Started

### Prerequisites

- Docker & Docker Compose
- (Optional) VS Code with Dev Containers extension

### Running the Application

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. **Start with Docker Compose:**
   ```bash
   docker compose up -d --build
   ```
   The application will be available at:
   - Frontend: `http://localhost` (or configured domain)
   - Backend API: `http://localhost/api/health`

### Development

For the best development experience, open this repository in a [GitHub Codespace](https://github.com/features/codespaces) or a local VS Code Dev Container. This will automatically set up the environment with all necessary runtimes and extensions.
