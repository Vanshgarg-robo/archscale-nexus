# ⚡ ArchScale Nexus

> **AI-Powered Coordination Intelligence & Architecture Blast Radius Platform**

ArchScale Nexus is an enterprise coordination and architecture intelligence engine designed to eliminate alignment friction across engineering, product, and architectural teams. Powered by **Google Gemini 2.5 Flash**, ArchScale Nexus maps cross-system dependencies, predicts change blast radii, identifies blockers proactively, and preserves institutional architectural decisions.

---

## ✨ Key Features

- 🧠 **AI-Powered Impact Analysis**: Automatically analyzes proposed schema and architectural changes, computes blast radii, and flags affected downstream services and teams using Google Gemini.
- 🕸️ **Interactive Knowledge Graph**: Visual topology powered by `@xyflow/react` showing live services, data pipelines, stakeholders, and upstream/downstream dependencies.
- 🚦 **Proactive Blocker & Risk Radar**: Real-time detection of cross-team dependencies, critical path bottlenecks, and automated resolution recommendations.
- 📜 **Institutional Memory Engine**: Centralized repository of Architecture Decision Records (ADRs), post-mortems, and design docs with semantic AI search.
- 👥 **Stakeholder Alignment & Approvals**: Multi-tier approval workflows with role-based sign-offs, communication logs, and automated notifications.
- 🎯 **What-If Architecture Simulator**: Test architectural shifts and simulate latency, risk, and team impact before writing a single line of code.

---

## 🏗️ Architecture & Tech Stack

```
archscale-nexus/
├── backend/          # FastAPI async REST API & Gemini AI Engine
├── frontend/         # Next.js 16 (App Router), React 19, Tailwind CSS v4
├── docker-compose.yml# Local development services (PostgreSQL)
└── .github/          # GitHub Actions CI pipelines
```

### Backend
- **FastAPI**: High-performance asynchronous Python API framework.
- **SQLAlchemy 2.0 (Async)**: Modern ORM supporting PostgreSQL (`asyncpg`) and SQLite (`aiosqlite`).
- **Google GenAI SDK**: Powered by Google's `gemini-2.5-flash` for high-speed structured extraction and reasoning.
- **Pydantic v2**: Type-safe request and response validation.
- **JWT Authentication**: Secure Bearer token authentication with role-based access control.

### Frontend
- **Next.js 16 (App Router)** & **React 19**
- **TypeScript**: Strict end-to-end type safety.
- **Tailwind CSS v4**: Ultra-fast, modern reactive interface.
- **@xyflow/react**: Interactive, customizable DAG and architecture topology graphs.
- **Recharts**: Metric dashboards and impact visualizations.
- **Zustand**: Lightweight client-side state management.

---

## 🚀 Quickstart Guide

### Prerequisites
- [Python 3.12+](https://www.python.org/downloads/)
- [Node.js 20+](https://nodejs.org/) and npm
- (Optional) [Docker](https://www.docker.com/) & Docker Compose

---

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
# On Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# On macOS/Linux:
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration
copy .env.example .env  # On Linux/macOS: cp .env.example .env

# Run FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend will be live at `http://localhost:8000`.  
Explore interactive API docs at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment configuration
copy .env.example .env.local  # On Linux/macOS: cp .env.example .env.local

# Run Next.js dev server
npm run dev
```

Open `http://localhost:3000` in your browser to access the ArchScale Nexus dashboard.

---

### 3. Running with Docker Compose (PostgreSQL)

If you prefer to run a local PostgreSQL instance:

```bash
docker-compose up -d
```

Update your `backend/.env` with:
```env
DATABASE_URL=postgresql+asyncpg://archscale:archscale_secret@localhost:5432/archscale_nexus
SYNC_DATABASE_URL=postgresql://archscale:archscale_secret@localhost:5432/archscale_nexus
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | Async database connection URL | `sqlite+aiosqlite:///./archscale.db` |
| `SYNC_DATABASE_URL` | Sync database connection URL | `sqlite:///./archscale.db` |
| `JWT_SECRET_KEY` | Secret key for JWT signing | *(Generate secure 64-char key)* |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Access token TTL | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `GEMINI_API_KEY` | Google AI Studio API Key | *(Get from Google AI Studio)* |
| `GEMINI_MODEL` | Gemini AI model identifier | `gemini-2.5-flash` |
| `ENVIRONMENT` | Runtime environment (`development` / `production`) | `development` |
| `DEBUG` | Verbose debug mode | `true` |
| `CORS_ORIGINS` | JSON list of allowed origins | `["http://localhost:3000"]` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL of the ArchScale Nexus backend | `http://localhost:8000` |

---

## 🔒 Security Best Practices

- **Never commit `.env` files**: All secrets, private keys, and database credentials are excluded in `.gitignore`.
- Always generate a strong, unique `JWT_SECRET_KEY` before deploying to production.
- Use PostgreSQL with SSL enabled (`sslmode=require`) in production environments.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
