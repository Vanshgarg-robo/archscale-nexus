# 🏛️ ArchScale Nexus

<div align="center">

![ArchScale Nexus Logo Banner](https://img.shields.io/badge/ArchScale-Nexus-0070F3?style=for-the-badge&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?style=for-the-badge&logo=render&logoColor=black)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

**The AI-Powered Coordination Intelligence Operating System for Architecture, Interior Design, Engineering, and Construction (AEC).**

[🌐 **Live Cloud Deployment**](https://archscale-nexus-frontend.onrender.com/) • [📡 **Interactive API Docs (Swagger)**](https://archscale-nexus.onrender.com/docs) • [💬 **AI Project Manager**](https://archscale-nexus-frontend.onrender.com/chat) • [⚡ **AI Impact Analysis**](https://archscale-nexus-frontend.onrender.com/impact)

</div>

---

## 🧭 What is ArchScale Nexus?

> **This is NOT a task manager. This is NOT a project tracker.**  
> ArchScale Nexus is a **Coordination Intelligence Operating System** built specifically for high-stakes Architecture, Interior Design, MEP Engineering, and Construction projects.

In complex built-environment projects, delays and cost overruns rarely happen because people don't have task lists—they happen due to **coordination blindspots**:
- An architect shifts a kitchen island 1.2 meters, but the electrical engineer isn't notified in time to reroute sub-floor conduit.
- A vendor's custom Italian Calacatta marble slab gets delayed at customs, silently cascading through waterproofing, screed, and millwork installations.
- Decisions made in WhatsApp site chats or weekly contractor meetings remain lost in message history until inspections fail.

**ArchScale Nexus acts as an AI Project Manager that automatically determines:**
1. **Who is responsible** for every deliverable, approval, and decision.
2. **Who is affected** whenever a change or delay is proposed.
3. **What depends on what** across multi-disciplinary dependency chains.
4. **What approvals are required** before downstream work commences.
5. **What is actively blocked** by missing drawings, overdue sign-offs, or supply delays.
6. **What risks exist** across schedule, vendor, coordination, and design domains.
7. **What should happen next** via actionable, prioritized AI guidance.

---

## 🚀 Live Demo & Instant Access

ArchScale Nexus is deployed and live on Render:

| Service | Live URL | Description |
| :--- | :--- | :--- |
| 🖥️ **Frontend Web App** | [https://archscale-nexus-frontend.onrender.com/](https://archscale-nexus-frontend.onrender.com/) | Next.js 16 reactive workspace with role-based UI |
| ⚙️ **Backend REST API** | [https://archscale-nexus.onrender.com](https://archscale-nexus.onrender.com) | FastAPI async microservice with SQLite WAL & Gemini integration |
| 📖 **API Documentation** | [https://archscale-nexus.onrender.com/docs](https://archscale-nexus.onrender.com/docs) | OpenAPI / Swagger interactive testing console |
| 🩺 **System Health Check** | [https://archscale-nexus.onrender.com/api/ping](https://archscale-nexus.onrender.com/api/ping) | Live service telemetry and health probe |

### 🔑 Pre-Seeded Demo Accounts (8 Personas)

The platform comes pre-seeded with a comprehensive flagship project:  
**"The Lumina Pavilion & Penthouse Residence"** *(5,500 sq ft luxury villa, 54 tasks, 26 dependencies, 18 approvals, 12 decisions, 12 risks, 4 change requests, 4 ingested communication records)*.

All pre-seeded demo accounts share the password: **`password123`** *(You can sign in using either the **Username** or **Email**)*.

#### 🎯 Quick Login Credentials (Client, Management & Team Member)

| Persona / Access | Role | Username | Email / Login ID | Password | Tailored Dashboard & Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 👤 **Client (rajiv)** | Principal Client | `rajiv` | `rajiv@client.com` | `password123` | **Executive Client Portal**: Isolated project view, drawing/document sign-offs, budget impact approvals |
| 👔 **Management (arjun)** | Project Manager | `arjun` | `arjun@archscale.io` | `password123` | **Coordination Command**: Full project oversight, blast-radius simulations, blocker resolution, approval workflows |
| 📐 **Member (Ananya)** | Lead Architect | `ananya` | `ananya@archscale.io` | `password123` | **Design Governance**: Architectural drawings, revision reviews, drawing sign-offs, aesthetic change requests |

---

## ⚡ 16 Core Coordination Intelligence Modules

```
                        ┌────────────────────────────────────────────────────────┐
                        │              ARCHSCALE NEXUS INTELLIGENCE              │
                        └────────────────────────────────────────────────────────┘
                                                    │
        ┌───────────────────────────┬───────────────┴───────────────┬───────────────────────────┐
        ▼                           ▼                               ▼                           ▼
[ Communication Intel ]     [ Knowledge Graph ]           [ AI Impact Engine ]          [ Project Memory ]
  • WhatsApp Transcripts      • Dynamic React Flow DAG      • Critical Path Cascades      • Semantic Natural Lang
  • Email & Voice Notes       • Blockers & Prerequisites    • Cross-Discipline Radius     • Referenced ADRs
  • Action Item Extraction    • Live Edge Tracing           • Mitigation Strategies       • Instant Retrieval
```

### 1. 👥 Stakeholder Intelligence & Matrix
- Multi-dimensional profiling: Authority level, coordination score, influence rating, and active workload index.
- Dynamically highlights overloaded consultants to prevent review bottlenecks before they impact schedules.

### 2. 💬 Communication Intelligence
- Ingest unformatted transcripts, emails, WhatsApp logs, and contractor site notes.
- Automatic AI extraction of deadlines, owners, decisions, pending approvals, risks, and action items into structured database entities.

### 3. ≋ AI Multi-Horizon Summarization
- Generates high-impact summaries across four horizons: **Executive**, **Daily Operational**, **Weekly Coordination**, and **Cumulative Project Briefings**.
- Switch between concise 3-bullet overviews and deep forensic breakdowns.

### 4. 🕸️ Project Knowledge Graph (Powered by `@xyflow/react`)
- Interactive, draggable node-graph visualizing cross-discipline relationships:
  - `depends_on`, `blocks`, `approved_by`, `assigned_to`, `affected_by`, `requires`.
- Click any node to open the **Context Slide-Over Drawer** showing prerequisites, downstream blockers, and direct actions.

### 5. ↗️ Change Request Engine
- Formal governance for design modifications (e.g., *"Shift kitchen island 1.2m"*, *"Calacatta marble heated floor"*).
- Tracks status through `Proposed` ➔ `Review` ➔ `Approved` ➔ `Rejected` ➔ `Implemented`.

### 6. ☊ Dependency Intelligence & Critical Path Cascades
- Real-time Directed Acyclic Graph (DAG) traversal computing downstream effects in `<2ms`.
- Demonstrates how a 2-day delay in drawing sign-off cascades into MEP conduit rework and cabinetry manufacturing delays.

### 7. ⚡ Flagship AI Impact Analysis Engine
- **The Core Flagship Innovation**: Input any potential architectural or material change to instantly receive:
  - **Affected Stakeholders**: Exactly who needs to be alerted.
  - **Affected Tasks & Vendors**: Downstream deliverables placed on hold.
  - **Estimated Schedule Delay**: Net impact on critical path.
  - **Overall Risk Score**: Low, Medium, High, or Critical.
  - **Actionable AI Recommendations**: Immediate steps to mitigate delay.
  - **1-Click Change Request Generation**: Convert analysis directly into an official proposal.

### 8. ✓ Multi-Tier Approval Intelligence
- Multi-party approval hierarchies: **Client Sign-off**, **Architectural Review**, **Structural Sign-off**, and **Vendor Clearance**.
- Enforces strict safety gates—downstream tasks cannot transition to in-progress without required sign-offs.

### 9. ⛔ Automated Blocker Detection Radar
- Continuously scans for missing approvals, broken dependencies, overdue items, and unassigned critical path tasks.
- Surfaces active blockers with AI-calculated resolution suggestions.

### 10. 🔔 Coordination Alert System
- Real-time notifications dispatched when dependency links break, risks escalate, or drawing reviews become overdue.
- Includes context-grounded AI explanations of *why* the alert matters.

### 11. 🧠 Project Memory (Semantic Natural Language Search)
- Natural language query interface over the entire project history:
  - *"Why was the marble specification changed from Carrara to Calacatta?"*
  - *"Who approved the master bedroom electrical redesign?"*
  - *"What caused the 4-day delay on the kitchen screed?"*
- Returns cited, timestamped answers referencing original decisions, meetings, and communications.

### 12. 🤖 AI Project Manager Chat
- Grounded assistant with real-time access to active project state, dependencies, approvals, and stakeholder workloads.
- Answers complex queries such as *"What is currently blocking the millwork installation and what should we do next?"*

### 13. ▣ What-If Scenario Simulator
- Test hypothetical project disruptions before they happen:
  - *"What if vendor delivery of lighting fixtures is delayed by 14 days?"*
  - *"What if client approval on layout drawings takes 1 extra week?"*
- Computes schedule slippage, budget exposure, and recommended mitigation strategies.

### 14. 🛡️ Multi-Dimensional Risk Intelligence
- Evaluates risk across 5 critical vectors: **Schedule**, **Coordination**, **Dependency**, **Approval**, and **Vendor**.
- Generates probability × impact matrices and actionable risk mitigation roadmaps.

### 15. 📈 Project Health Scoring Engine
- Dynamic 0–100 composite health score evaluating task velocity, overdue approvals, critical blockers, and dependency debt.
- Categorizes status into **Healthy**, **At Risk**, or **Critical**.

### 16. 🎛️ Executive Command Center & Dedicated Role Portals
- **Role-Tailored Dashboards**:
  - **Admin Command**: Organization health, security audit logs, platform settings.
  - **Client Portal**: Project milestone progress, drawing documents, pending sign-offs.
  - **Management Command**: Sprint status, critical path, blocker resolution, approval queues.
  - **Vendor Portal**: Active work orders, material specifications, site delivery notices.
- **Interactive Kitchen Redesign Simulation**: 1-click live walkthrough running an 8-step ripple effect through the entire system.

---

## 🛠️ Technology Stack

```
Frontend Architecture (Next.js 16 + React 19 + Turbopack)
├── Dynamic Role-Based AppShell
├── Interactive React Flow Knowledge Graph (@xyflow/react)
├── Modern Responsive UI with CSS Variables & Glassmorphism
└── Zustand Session Management & Axios/Fetch API Client

Backend Architecture (FastAPI + Python 3.12 + SQLAlchemy 2.0 Async)
├── Dual Route Handlers (/api/* & direct /* for legacy compatibility)
├── Robust RBAC Middleware with 8 Discrete Roles
├── SQLite WAL (Local) / PostgreSQL + asyncpg (Production)
├── In-Memory BFS Traversal for Sub-Millisecond Critical Path Resolution
└── Google Gemini 2.5 Flash GenAI Integration (Structured Outputs)
```

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, `@xyflow/react`, Recharts, Lucide Icons, Zustand.
- **Backend**: FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, Google GenAI SDK (`gemini-2.5-flash`), `bcrypt`, `pyjwt`.
- **Database**: SQLite with WAL mode (`PRAGMA journal_mode=WAL`) for local / Neon PostgreSQL for cloud production.
- **Deployment**: Render Web Services (Dockerized Backend + Node.js Frontend) with automated health probes.

---

## 💻 Local Development Setup

### Prerequisites
- **Python 3.12+**
- **Node.js 20+** and `npm`
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Vansh-Garg-1/archscale-nexus.git
cd archscale-nexus
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
# Windows:
python -m venv .venv
.\.venv\Scripts\activate

# macOS / Linux:
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
*Backend API will be live at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.*

### 3. Frontend Setup
```bash
# In a new terminal:
cd frontend

# Install packages
npm install

# Configure environment variables
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS/Linux

# Start Next.js development server
npm run dev
*Open `http://localhost:3000` in your browser to access ArchScale Nexus.*

> 🔑 **Demo Login Quick-Reference**:
> - **Client**: Username `rajiv` *(or `rajiv@client.com`)* • Password: `password123`
> - **Management**: Username `arjun` *(or `arjun@archscale.io`)* • Password: `password123`
> - **Member (Ananya)**: Username `ananya` *(or `ananya@archscale.io`)* • Password: `password123`

---

## 🧪 Testing & Verification

The project includes an end-to-end integration test suite verifying authentication, RBAC authorization, all 16 module endpoints, and the interactive demo pipeline:

```bash
cd backend
python test_all_endpoints.py
```

Expected output:
```
--- 1. Testing Login ---
Login Status: 200 (Arjun Reddy - project_manager)

--- 2. Getting Projects ---
Projects Status: 200 (Active project: The Lumina Pavilion & Penthouse Residence)

--- 3. Testing Demo Pipeline /api/demo/kitchen-redesign ---
Demo Pipeline Status: 200 (8 steps executed successfully)

--- 4. Testing All Module Endpoints ---
[PASS] GET /api/dashboard/1 -> 200
[PASS] GET /api/stakeholders/project/1 -> 200
[PASS] GET /api/stakeholders/matrix/1 -> 200
[PASS] GET /api/dependencies/project/1 -> 200
[PASS] GET /api/dependencies/critical-path/1 -> 200
[PASS] GET /api/approvals/pending/1 -> 200
[PASS] GET /api/change-requests/project/1 -> 200
[PASS] GET /api/risks/project/1 -> 200
[PASS] GET /api/health/1 -> 200
[PASS] GET /api/blockers/1 -> 200
[PASS] GET /api/graph/1 -> 200
[PASS] POST /api/memory/search -> 200
[PASS] POST /api/impact/analyze -> 200
[PASS] POST /api/ai/simulate -> 200
[PASS] POST /api/ai/chat -> 200
[PASS] POST /api/ai/summarize -> 200

All endpoints passed: True
```

---

## 🚢 Render Deployment Guide

ArchScale Nexus is configured for turnkey infrastructure on Render using [`render.yaml`](render.yaml):

1. Fork or push this repository to GitHub.
2. Link your repository in the [Render Dashboard](https://dashboard.render.com).
3. Render automatically provisions:
   - **`archscale-nexus`**: Docker Web Service running the FastAPI backend with healthcheck at `/api/ping`.
   - **`archscale-nexus-frontend`**: Node Web Service building and serving the Next.js 16 frontend.
4. Set your `GEMINI_API_KEY` and `JWT_SECRET_KEY` in the Render environment settings.
5. Your application is live at `https://archscale-nexus-frontend.onrender.com/`.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Built with precision for architects, engineers, and builders who coordinate the real world.
<br />
<strong>ArchScale Nexus © 2026</strong>
</div>
