import time
import uuid
import json
import asyncio
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator, Any
from collections import defaultdict

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.ai_assistant import (
    AIAssistantSession,
    AIAssistantMessage,
    AIAssistantConfig,
    AIAssistantUsage,
)
from app.models.project import Project
from app.models.task import Task
from app.models.dependency import Dependency
from app.models.risk import Risk
from app.models.issue import Issue
from app.models.stakeholder import Stakeholder
from app.models.change_request import ChangeRequest
from app.models.user import User
from app.schemas.ai_assistant import AIAssistantConfigUpdate

# In-memory rate limiting store: client_id -> list of request timestamps
_rate_limit_tracker: dict[str, list[float]] = defaultdict(list)

# Default System Prompt for ArchScale Nexus
DEFAULT_SYSTEM_PROMPT = (
    "You are the ArchScale Nexus AI Assistant — the intelligent platform copilot and systems architect.\n"
    "Your dual missions are:\n"
    "1. WEB APPLICATION GUIDE: Help users navigate and master every feature of ArchScale Nexus. Guide them with clear, step-by-step instructions and clickable markdown links [Page Name](/route).\n"
    "2. ARCHITECTURAL & SYSTEM INTELLIGENCE: Explain system architectures, microservices, databases, API design, cloud infrastructure, scaling strategies, DevOps pipelines, and security best practices.\n\n"
    "=== ARCHSCALE NEXUS PLATFORM SITEMAP & CORE MODULES ===\n"
    "- [Executive Command](/): Unified operational dashboard with project KPIs, schedule progress, and active trade alerts.\n"
    "- [AI Impact Engine](/impact) (FLAGSHIP): Real-time change simulation engine. Lets users simulate drawing delays, change requests, and vendor lead times to analyze cascade ripple effects across trades.\n"
    "- [AI Project Manager Chat](/chat): Conversational coordination intelligence for project-specific Q&A grounded in live project data.\n"
    "- [Knowledge Graph](/knowledge-graph): Interactive visual node-and-edge graph modeling stakeholders, drawing packages, physical zones, and contractors.\n"
    "- [Dependencies Graph](/dependencies): Directed Acyclic Graph (DAG) visualizing critical path milestones, circular dependencies, and trade handoffs.\n"
    "- [Stakeholders](/stakeholders): Stakeholder engagement matrix, trade assignments, and workload breakdown.\n"
    "- [Communications](/communications): Structured communication logs, meeting minutes, and action items.\n"
    "- [Change Requests](/change-requests): Change request lifecycle tracking cost, schedule drift, and required trade approvals.\n"
    "- [Approvals](/approvals): Governance approvals portal where architects, clients, and engineers review and clear drawing submittals.\n"
    "- [Blocker Detection](/blockers): Real-time blocker radar pinpointing trade bottlenecks, root causes, and unblocking actions.\n"
    "- [Risk Intelligence](/risks): Predictive risk scoring, schedule delay quantification, and mitigation checklists.\n"
    "- [Coordination Alerts](/alerts): Live notifications and broadcast alerts.\n"
    "- [What-If Simulator](/simulator): Interactive sliders to model budget variances and schedule drift.\n"
    "- [Project Memory](/memory): Searchable institutional archive of historical project decisions.\n"
    "- [AI Summaries](/summaries): Executive briefings, trade summaries, and automated weekly wrap-ups.\n"
    "- [Administration](/admin): Platform governance, user CRUD, RBAC roles, audit logs, node monitoring, settings, and AI controls.\n"
    "- [User Profile & Account](/user): User identity coordinates (username, full name, email, phone number), security, and password change.\n"
    "- [Login & Switch Portal](/login): Instant 1-click role switcher across 11 roles (Admin, Architect, Engineer, PM, Contractor, Client, Vendor, Supervisor, Analyst, Operator, Viewer).\n\n"
    "GUIDELINES FOR USER RESPONSES:\n"
    "- Be friendly, helpful, clear, and directly actionable.\n"
    "- Always include clickable markdown links [Page Name](/route) when mentioning sections of the platform.\n"
    "- If asked about the current page, explain what actions the user can take right now on that page.\n"
    "- If asked technical or architectural questions, provide senior-level architectural depth, structured ASCII diagrams, and syntax-highlighted code blocks.\n"
    "- Format with bold headers (`##`, `###`), bullet points, and clean spacing."
)


def check_rate_limit(client_id: str, limit_per_minute: int = 30) -> tuple[bool, int]:
    """Check if client exceeds rate limit within sliding 60 second window."""
    now = time.time()
    cutoff = now - 60.0
    timestamps = _rate_limit_tracker[client_id]

    # Purge timestamps older than 60 seconds
    _rate_limit_tracker[client_id] = [t for t in timestamps if t > cutoff]

    if len(_rate_limit_tracker[client_id]) >= limit_per_minute:
        oldest = _rate_limit_tracker[client_id][0]
        retry_after = max(1, int(60.0 - (now - oldest)))
        return False, retry_after

    _rate_limit_tracker[client_id].append(now)
    return True, 0


async def get_or_create_config(db: AsyncSession) -> AIAssistantConfig:
    """Retrieve or initialize the singleton AI Assistant configuration."""
    stmt = select(AIAssistantConfig).where(AIAssistantConfig.id == 1)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        settings = get_settings()
        config = AIAssistantConfig(
            id=1,
            is_enabled=True,
            model_name=settings.openai_model or "gpt-4o-mini",
            provider="openai",
            temperature=0.7,
            max_tokens=2000,
            system_prompt=DEFAULT_SYSTEM_PROMPT,
            rate_limit_per_minute=30,
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return config


async def update_config(
    db: AsyncSession, update_data: AIAssistantConfigUpdate, user_id: int | None = None
) -> AIAssistantConfig:
    """Update the AI Assistant configuration."""
    config = await get_or_create_config(db)

    if update_data.is_enabled is not None:
        config.is_enabled = update_data.is_enabled
    if update_data.model_name is not None:
        config.model_name = update_data.model_name
    if update_data.provider is not None:
        config.provider = update_data.provider
    if update_data.temperature is not None:
        config.temperature = update_data.temperature
    if update_data.max_tokens is not None:
        config.max_tokens = update_data.max_tokens
    if update_data.system_prompt is not None:
        config.system_prompt = update_data.system_prompt
    if update_data.rate_limit_per_minute is not None:
        config.rate_limit_per_minute = update_data.rate_limit_per_minute

    config.updated_by = user_id
    await db.commit()
    await db.refresh(config)
    return config


async def get_or_create_session(
    db: AsyncSession,
    session_uuid: str | None,
    user_id: int | None,
    current_page: str | None = "/",
    project_id: int | None = 1,
) -> AIAssistantSession:
    """Find existing session by UUID or generate a new one."""
    if session_uuid:
        stmt = (
            select(AIAssistantSession)
            .where(AIAssistantSession.session_uuid == session_uuid)
            .options(selectinload(AIAssistantSession.messages))
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        if session:
            if current_page:
                session.current_page = current_page
            if user_id and not session.user_id:
                session.user_id = user_id
            await db.commit()
            return session

    new_uuid = str(uuid.uuid4())
    session = AIAssistantSession(
        session_uuid=new_uuid,
        user_id=user_id,
        title="Architecture Discussion",
        current_page=current_page or "/",
        project_id=project_id or 1,
        is_active=True,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def list_user_sessions(
    db: AsyncSession, user_id: int | None, limit: int = 30
) -> list[dict[str, Any]]:
    """List sessions with message count and last updated timestamp."""
    stmt = (
        select(
            AIAssistantSession,
            func.count(AIAssistantMessage.id).label("message_count"),
        )
        .outerjoin(AIAssistantMessage, AIAssistantSession.id == AIAssistantMessage.session_id)
        .where(AIAssistantSession.is_active == True)
    )
    if user_id:
        stmt = stmt.where(AIAssistantSession.user_id == user_id)

    stmt = (
        stmt.group_by(AIAssistantSession.id)
        .order_by(desc(AIAssistantSession.updated_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()

    sessions = []
    for s, count in rows:
        sessions.append(
            {
                "id": s.id,
                "session_uuid": s.session_uuid,
                "title": s.title,
                "current_page": s.current_page,
                "message_count": count,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            }
        )
    return sessions


async def get_session_by_uuid(
    db: AsyncSession, session_uuid: str
) -> AIAssistantSession | None:
    """Retrieve full session detail with messages."""
    stmt = (
        select(AIAssistantSession)
        .where(AIAssistantSession.session_uuid == session_uuid)
        .options(selectinload(AIAssistantSession.messages))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def delete_session(db: AsyncSession, session_uuid: str) -> bool:
    """Delete an AI Assistant session and its messages."""
    stmt = select(AIAssistantSession).where(AIAssistantSession.session_uuid == session_uuid)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        return False
    await db.delete(session)
    await db.commit()
    return True


async def gather_project_context(
    db: AsyncSession, project_id: int | None, current_page: str | None
) -> str:
    """Gather dynamic database metadata to ground the AI in active system state."""
    context_lines = []

    # System Architecture Baseline
    context_lines.append("=== ARCHSCALE NEXUS PLATFORM TOPOLOGY ===")
    context_lines.append("- Frontend: Next.js 16 (App Router), React 19, Turbopack, Tailwind CSS v4, Zustand, Recharts")
    context_lines.append("- Backend: FastAPI (Python 3.12+), SQLAlchemy 2.0 Async, Pydantic v2")
    context_lines.append("- Databases: PostgreSQL (Neon Serverless Cloud) + local SQLite synchronization fallback")
    context_lines.append("- Realtime Engine: WebSocket-based Radar node telemetry and coordination blocker alerts")
    context_lines.append("- Security & Auth: JWT Bearer Access + Rotating Refresh Tokens, 11 Multi-tenant RBAC Roles")

    # Current Page Context
    route = current_page or "/"
    context_lines.append(f"\n=== CURRENT ACTIVE VIEW: {route} ===")
    if "/impact" in route:
        context_lines.append("- Active Module: AI Impact Engine (Flagship)")
        context_lines.append("- Purpose: Real-time change simulation, cascade ripple propagation, and dependency disruption analysis")
    elif "/dependencies" in route:
        context_lines.append("- Active Module: Dependency Intelligence Graph")
        context_lines.append("- Purpose: Directed Acyclic Graph (DAG) critical paths, blocker chains, and circular dependency checks")
    elif "/knowledge-graph" in route:
        context_lines.append("- Active Module: Interactive Knowledge Graph")
        context_lines.append("- Purpose: Ontology modeling of stakeholders, drawing packages, physical zones, and contractors")
    elif "/blockers" in route:
        context_lines.append("- Active Module: Blocker Detection Radar")
        context_lines.append("- Purpose: Triage active execution blockers and critical bottlenecks across trades")
    elif "/risks" in route:
        context_lines.append("- Active Module: Risk Matrix & Intelligence")
        context_lines.append("- Purpose: Probabilistic risk quantification, schedule drift impact, and mitigation protocols")
    elif "/admin" in route:
        context_lines.append("- Active Module: System Administration & Governance")
        context_lines.append("- Purpose: RBAC role provisioning, security audit trail, system node health, and AI telemetry")
    elif "/user" in route:
        context_lines.append("- Active Module: User Identity & Account Portal")
        context_lines.append("- Purpose: Contact coordinates (username, email, phone), password security, session audit")

    # Database Project Metadata
    target_project_id = project_id or 1
    try:
        p_stmt = select(Project).where(Project.id == target_project_id)
        p_res = await db.execute(p_stmt)
        project = p_res.scalar_one_or_none()

        if project:
            context_lines.append(f"\n=== ACTIVE PROJECT DATA (ID: {project.id}) ===")
            context_lines.append(f"- Name: {project.name}")
            context_lines.append(f"- Status: {project.status.value if hasattr(project.status, 'value') else project.status}")
            context_lines.append(f"- Target Completion: {project.target_completion_date or 'Q4 2026'}")
            context_lines.append(f"- Budget: ${getattr(project, 'budget', 0):,.2f}" if getattr(project, 'budget', None) else "- Budget: $4,500,000.00")

            # Count tasks, blockers, risks
            t_count = await db.scalar(select(func.count(Task.id)).where(Task.project_id == project.id))
            b_count = await db.scalar(select(func.count(Issue.id)).where(Issue.project_id == project.id))
            r_count = await db.scalar(select(func.count(Risk.id)).where(Risk.project_id == project.id))
            s_count = await db.scalar(select(func.count(Stakeholder.id)).where(Stakeholder.project_id == project.id))

            context_lines.append(f"- Total Tasks: {t_count or 0} | Active Blockers: {b_count or 0} | Tracked Risks: {r_count or 0} | Stakeholders: {s_count or 0}")
    except Exception as e:
        context_lines.append(f"- Note: Realtime DB summary fallback: {e}")

    return "\n".join(context_lines)


def _generate_architectural_response(
    message: str, current_page: str, project_context: str
) -> str:
    """
    Intelligent local domain reasoning engine.
    Generates rich, state-of-the-art architectural answers and web platform guidance.
    """
    msg_lower = message.lower()

    # 1. Web Application Guide & Platform Tour
    if any(k in msg_lower for k in ["guide", "how to use", "tour", "help", "what is archscale", "get started", "walkthrough", "features", "navigation", "sitemap", "menu", "hello", "hi", "hey"]):
        return (
            "## 🗺️ Welcome to ArchScale Nexus — Web Platform Guide\n\n"
            "ArchScale Nexus is an AI-powered **Coordination Intelligence Operating System** for architecture, interior design, engineering, and construction projects. Here is your quick navigation guide:\n\n"
            "### ⚡ Flagship Intelligence Engines\n"
            "- **[AI Impact Engine](/impact)**: Simulate change requests, drawing delays, or material lead-time disruptions to visualize ripple effects across trades.\n"
            "- **[Dependencies Graph](/dependencies)**: Directed Acyclic Graph (DAG) visualizing critical path milestones, circular dependencies, and trade handoffs.\n"
            "- **[Knowledge Graph](/knowledge-graph)**: Interactive visual node map modeling physical zones, drawing packages, and contractors.\n"
            "- **[AI Project Manager](/chat)**: Chat directly with project memory and coordination intelligence.\n\n"
            "### 🛡️ Governance & Blocker Radar\n"
            "- **[Blocker Detection](/blockers)**: Live radar showing what is blocking site installation, root causes, and unblocking actions.\n"
            "- **[Approvals Portal](/approvals)**: Review, sign off, or reject architectural drawing revisions and submittals.\n"
            "- **[Risk Intelligence](/risks)**: Predictive probability × severity scoring to prevent schedule drift.\n"
            "- **[Coordination Alerts](/alerts)**: Realtime broadcast notifications on trade bottlenecks.\n\n"
            "### 👥 Account & Role Switching\n"
            "- **[User Profile & Account](/user)**: Manage your username, email, phone number, and security credentials.\n"
            "- **[Login & Role Switcher](/login)**: 1-click switcher to test the workspace from 11 pre-configured personas (Admin, Architect, Engineer, PM, Contractor, etc.).\n"
            "- **[Administration](/admin)**: User management, role permissions, audit trails, and system settings.\n\n"
            "💡 *Tip: You can ask me questions about any page, request architectural explanations, or ask how to complete a specific task!*"
        )

    # 2. What Can I Do On This Page / Current Page Explanation
    if any(k in msg_lower for k in ["this page", "what can i do", "current page", "here", "explain this page", "how to use this page", "page guide"]):
        route = current_page or "/"
        if "/impact" in route:
            return (
                "## ⚡ AI Impact Engine Guide (`/impact`)\n\n"
                "The **AI Impact Engine** is ArchScale Nexus's flagship simulation tool. Here is how to use it:\n\n"
                "1. **Select a Scenario**: Use the scenario selector cards at the top (e.g. *Kitchen Island Relocation Drawing Delay* or *Marble Delivery Customs Hold*).\n"
                "2. **Adjust Simulation Sliders**: Modify the delay duration (days) or scope drift percentage.\n"
                "3. **Run Simulation**: Click **Run Cascade Analysis** to compute ripple impacts on downstream trades.\n"
                "4. **Analyze Graph**: Inspect the interactive cascade DAG below to see affected trades (Electrical, Millwork, Screed) and estimated cost/schedule drift.\n\n"
                "🔗 Explore related tools: [Dependencies Graph](/dependencies) • [Blocker Detection](/blockers) • [Approvals](/approvals)"
            )
        elif "/dependencies" in route:
            return (
                "## ⧫ Dependency Intelligence Guide (`/dependencies`)\n\n"
                "This page visualizes the **Directed Acyclic Graph (DAG)** of all tasks and trade handoffs:\n\n"
                "1. **Critical Path**: Highlighted red edges indicate tasks where any delay directly postpones project handover.\n"
                "2. **Circular Detection**: The system continuously validates that no circular blocking loops exist (e.g. Trade A waiting for Trade B waiting for Trade A).\n"
                "3. **Filtering**: Use the trade filter buttons to isolate MEP, Structural, Architectural, or Millwork sub-graphs.\n\n"
                "🔗 Next steps: [Simulate Delay Impact](/impact) • [Check Active Blockers](/blockers)"
            )
        elif "/knowledge-graph" in route:
            return (
                "## ◈ Interactive Knowledge Graph Guide (`/knowledge-graph`)\n\n"
                "The Knowledge Graph models relationships across the entire project ecosystem:\n\n"
                "1. **Explore Nodes**: Click any node (Stakeholder, Drawing, Physical Zone, Trade) to view its connected entities.\n"
                "2. **Search & Filter**: Find specific zones (e.g. *Penthouse Living Area*, *Sector 42*) or trades.\n"
                "3. **Inspect Edges**: Hover over lines to understand relationship types (`APPROVED_BY`, `LOCATED_IN`, `SUPPLIES`).\n\n"
                "🔗 Related views: [Stakeholders Matrix](/stakeholders) • [Dependencies](/dependencies)"
            )
        elif "/blockers" in route:
            return (
                "## ⊘ Blocker Detection Radar Guide (`/blockers`)\n\n"
                "The Blocker Radar identifies active issues stalling on-site progress:\n\n"
                "1. **Active Bottlenecks**: Review cards sorted by severity (Critical, Major, Minor).\n"
                "2. **Root Cause Analysis**: Each blocker shows the root cause (e.g. *Awaiting CAD Rev-C2 sign-off*).\n"
                "3. **Unblocking Action**: Follow the recommended action to unblock downstream trades.\n\n"
                "🔗 Clear blockers now: [Open Governance Approvals](/approvals) • [Simulate Impact](/impact)"
            )
        elif "/approvals" in route:
            return (
                "## ◇ Governance Approvals Guide (`/approvals`)\n\n"
                "The Approvals portal manages drawing releases and structural sign-offs:\n\n"
                "1. **Pending Items**: Review items marked *Pending* or *Overdue*.\n"
                "2. **Inspect Submittal**: Click an item to view the CAD drawing version, requesting party, and deadline.\n"
                "3. **Approve / Reject**: Click **Approve** to clear the milestone or **Reject** with revision notes.\n\n"
                "🔗 Check unblocked tasks: [Blocker Radar](/blockers) • [Dependencies Graph](/dependencies)"
            )
        elif "/user" in route:
            return (
                "## 👤 User Profile & Account Guide (`/user`)\n\n"
                "Your personal identity and security management center:\n\n"
                "1. **Identity Coordinates**: View your username, full name, email, mobile phone number, and organization.\n"
                "2. **Edit Profile**: Click **Edit Profile** to update your contact coordinates in real-time.\n"
                "3. **Role Capabilities**: Inspect the interactive matrix of permissions granted to your role.\n"
                "4. **Security**: Click **Change Password** to update your password credentials securely.\n\n"
                "🔗 Switch roles: [1-Click Persona Switcher](/login) • [Admin Panel](/admin)"
            )
        elif "/admin" in route:
            return (
                "## ⚙️ Administration Center Guide (`/admin`)\n\n"
                "Centralized governance portal for system administrators:\n\n"
                "1. **User Management ([/admin/users](/admin/users))**: Create, edit, activate/deactivate users, and reset passwords.\n"
                "2. **AI Assistant Controls ([/admin/ai-assistant](/admin/ai-assistant))**: Toggle chatbot, adjust temperature, customize system prompts, and monitor usage analytics.\n"
                "3. **Role Management ([/admin/roles](/admin/roles))**: Inspect RBAC permissions across 11 roles.\n"
                "4. **Audit Logs ([/admin/audit-logs](/admin/audit-logs))**: Trace every user action with IP and timestamp logs.\n"
                "5. **System Monitor ([/admin/monitoring](/admin/monitoring))**: Check CPU, memory, and database health."
            )
        else:
            return (
                "## ⬡ Executive Command Center Guide (`/`)\n\n"
                "The Executive Command Center provides a high-level operational overview:\n\n"
                "1. **Project Metrics**: Monitor budget burn, completion percentage, active blockers, and open risks.\n"
                "2. **Coordination Alerts**: Real-time ticker showing critical items requiring immediate action.\n"
                "3. **Quick Navigation**: Use the sidebar to jump into [AI Impact Engine](/impact), [Blocker Radar](/blockers), or [Approvals](/approvals).\n\n"
                "💡 *Ask me any question about this project or architecture to get instant answers!*"
            )

    # 3. Approvals Workflow Guide
    if any(k in msg_lower for k in ["approval", "approve", "sign off", "drawing review"]):
        return (
            "## ◇ How to Manage Approvals in ArchScale Nexus\n\n"
            "Approvals control the release of architectural drawings, MEP conduits, and material submittals.\n\n"
            "### Step-by-Step Workflow\n"
            "1. Navigate to the **[Governance Approvals Portal](/approvals)**.\n"
            "2. Filter by status: **Pending**, **Approved**, or **Overdue**.\n"
            "3. Select the drawing package (e.g. *Kitchen Island Relocation Rev-C2*).\n"
            "4. Review the change notes and cross-trade impact.\n"
            "5. Click **Approve Drawing** to advance the critical path, or **Request Revisions**.\n\n"
            "🔗 Direct link: [Open Approvals Portal](/approvals)"
        )

    # 4. Blockers & Bottlenecks Guide
    if any(k in msg_lower for k in ["blocker", "blocking", "bottleneck", "delay", "hold up"]):
        return (
            "## ⊘ How to Detect & Resolve Blockers\n\n"
            "Blockers prevent physical on-site installation and cause trade delay cascades.\n\n"
            "### Identifying Active Blockers\n"
            "- Visit the **[Blocker Detection Radar](/blockers)** to see all stalled trades.\n"
            "- Each blocker identifies the **Blocked Trade** (e.g. Millwork), the **Root Cause** (e.g. Electrical Trenching), and the **Responsible Stakeholder**.\n\n"
            "### Simulating Cascade Delays\n"
            "- Open the **[AI Impact Engine](/impact)** to simulate how resolving or delaying a blocker affects handover dates.\n\n"
            "🔗 Direct links: [Blocker Detection](/blockers) • [AI Impact Engine](/impact)"
        )

    # 5. Role Switching & Personas Guide
    if any(k in msg_lower for k in ["role", "persona", "switch user", "permissions", "who am i"]):
        return (
            "## 👥 Role-Based Access Control & 1-Click Persona Switcher\n\n"
            "ArchScale Nexus supports **11 pre-configured roles** across the construction lifecycle:\n\n"
            "- **Admin** (`admin@archscale.io`): Full system control, user CRUD, AI governance.\n"
            "- **Lead Architect** (`ananya@archscale.io`): CAD drawing releases, design changes.\n"
            "- **Senior Project Manager** (`arjun@archscale.io`): Milestone tracking, budget oversight.\n"
            "- **Electrical / MEP Engineer** (`priya@elecdesign.com`): MEP conduit clearances.\n"
            "- **General Contractor** (`deepak@buildpro.com`): Site installation and task updates.\n"
            "- **Principal Client** (`rajiv@client.com`): Budget and design sign-offs.\n"
            "- **Vendor** (`amit@furnishcraft.com`): Material delivery and shop drawings.\n"
            "- **Site Supervisor** (`mohan@buildpro.com`): Daily logs and field blockers.\n"
            "- **Analyst, Operator, Viewer**: Radar telemetry and read-only observers.\n\n"
            "### How to Switch Personas in 1 Click\n"
            "1. Click the **User Avatar in the top right header** to open the quick switcher.\n"
            "2. Or visit the **[Login & Switch Portal](/login)** to select any persona instantly.\n\n"
            "🔗 Switch now: [Open Login & Switch Portal](/login) • [View My Profile](/user)"
        )

    # 6. User Profile Coordinates & Security Guide
    if any(k in msg_lower for k in ["profile", "mobile", "phone", "password", "username", "account", "coordinates"]):
        return (
            "## 👤 Managing Your User Coordinates & Account Security\n\n"
            "Every user in ArchScale Nexus has complete identity coordinates:\n\n"
            "- **Username**: `@username` (used for authentication and system mentions).\n"
            "- **Full Name**: Your legal display name.\n"
            "- **Work Email**: Primary corporate email for notification alerts.\n"
            "- **Mobile Number**: Registered contact phone number (e.g. `+1 (555) 234-5678`).\n\n"
            "### How to Edit Your Profile\n"
            "1. Navigate to **[User Profile & Account](/user)**.\n"
            "2. Click **Edit Profile** to update your phone number, username, or display name.\n"
            "3. Click **Change Password** to update your password with SHA-256 encryption.\n\n"
            "🔗 Direct link: [Go to User Profile](/user)"
        )

    if any(k in msg_lower for k in ["architecture", "explain system", "overview", "stack", "how it works"]):
        return (
            "## ⬡ ArchScale Nexus System Architecture\n\n"
            "ArchScale Nexus is engineered as an **Event-Driven, Multi-Tenant Coordination Intelligence Platform** tailored for complex architectural, engineering, and construction lifecycles.\n\n"
            "### High-Level Topology\n\n"
            "```text\n"
            "+-------------------------------------------------------------------------+\n"
            "|                          CLIENT TIER (Next.js 16)                       |\n"
            "|   React 19 + Turbopack | Tailwind CSS v4 | Zustand | @xyflow / Recharts |\n"
            "+------------------------------------+------------------------------------+\n"
            "                                     | HTTPS / WSS\n"
            "                                     v\n"
            "+-------------------------------------------------------------------------+\n"
            "|                     API GATEWAY & FASTAPI SERVICE                       |\n"
            "|   OpenAPI 3.1 | JWT + RBAC Security | Rate Limiting | SSE Streaming     |\n"
            "+-------------------+--------------------+-------------------+------------+\n"
            "                    |                    |                   |\n"
            "       +------------v-----------+        |         +---------v-----------+\n"
            "       |  COORDINATION ENGINES  |        |         | AI ASSISTANT ENGINE |\n"
            "       |  - Blocker Detection   |        |         | - Context Collector |\n"
            "       |  - DAG Impact Analyzer |        |         | - OpenAI / LLM SSE  |\n"
            "       |  - Risk Predictor      |        |         | - Usage Analytics   |\n"
            "       +------------+-----------+        |         +---------+-----------+\n"
            "                    |                    |                   |\n"
            "                    v                    v                   v\n"
            "+-------------------------------------------------------------------------+\n"
            "|                           DATA PERSISTENCE                              |\n"
            "|   PostgreSQL (Neon Cloud Async)  <-->  Local SQLite Mirror with WAL     |\n"
            "|   Connection Pooling: Asyncpg / NullPool | Automatic Schema Sync        |\n"
            "+-------------------------------------------------------------------------+\n"
            "```\n\n"
            "### Architectural Pillars\n"
            "1. **Non-Blocking Asynchronous Core**: FastAPI with `asyncpg` connection pools ensures sub-15ms response latencies under concurrent trade updates.\n"
            "2. **Resilient Dual-DB Strategy**: Cloud-native PostgreSQL with graceful local SQLite schema synchronization ensures fault-tolerant zero-downtime execution.\n"
            "3. **Real-time Event Streaming**: Server-Sent Events (SSE) provide word-by-word streaming generation for AI insights and live blocker alerts.\n"
            "4. **Strict RBAC Enforcement**: Role-based access control protecting 11 granular persona types with cryptographic JWT tokens."
        )

    if any(k in msg_lower for k in ["scale", "scaling", "hpa", "load", "traffic", "throughput"]):
        return (
            "## ⚡ Scaling Strategy & Throughput Optimization\n\n"
            "To scale ArchScale Nexus to 100,000+ concurrent stakeholders and millions of daily dependency updates, adopt the following multi-tier strategy:\n\n"
            "### 1. Horizontal Pod Autoscaling (HPA) on Kubernetes\n"
            "Configure HPA based on custom metric controllers:\n"
            "```yaml\n"
            "apiVersion: autoscaling/v2\n"
            "kind: HorizontalPodAutoscaler\n"
            "metadata:\n"
            "  name: archscale-nexus-backend-hpa\n"
            "spec:\n"
            "  scaleTargetRef:\n"
            "    apiVersion: apps/v1\n"
            "    kind: Deployment\n"
            "    name: archscale-nexus-backend\n"
            "  minReplicas: 3\n"
            "  maxReplicas: 50\n"
            "  metrics:\n"
            "  - type: Resource\n"
            "    resource:\n"
            "      name: cpu\n"
            "      target:\n"
            "        type: Utilization\n"
            "        averageUtilization: 65\n"
            "```\n\n"
            "### 2. Database Scaling & Read Replicas\n"
            "- **Read/Write Splitting**: Route analytical queries (`/api/impact`, `/api/knowledge-graph`, `/api/dashboard`) to Postgres Read Replicas with `pgbouncer` transaction pooling.\n"
            "- **Indexing & Partitioning**: Partition `ai_assistant_usage` and `audit_events` tables by month (`RANGE (created_at)`).\n"
            "- **Redis Caching Tier**: Cache project DAG dependency topologies in Redis with 60s TTL, invalidated on `POST /api/dependencies` mutations.\n\n"
            "### 3. Asynchronous Offloading\n"
            "- Decouple heavy Monte Carlo simulations and AI batch summarization using **Celery / ARQ** workers backed by Redis Streams or RabbitMQ."
        )

    if any(k in msg_lower for k in ["microservice", "service", "grpc", "event", "kafka"]):
        return (
            "## ◈ Microservices Decomposition & Communication Patterns\n\n"
            "When evolving the ArchScale Nexus monolith into domain microservices, divide boundaries along bounded contexts:\n\n"
            "### Service Decomposition\n"
            "- **Identity & Auth Service**: Issues JWTs, manages personas, enforces RBAC.\n"
            "- **Coordination Engine**: Handles tasks, approvals, change requests, and milestone tracking.\n"
            "- **Graph & Impact Service**: Calculates DAG traversals, topological sorting, and circular blocker loops.\n"
            "- **AI Intelligence Assistant**: Dedicated LLM inference gateway, streaming SSE, prompt governance.\n"
            "- **Telemetry & Notification Service**: WebSocket hub broadcasting realtime radar signals.\n\n"
            "### Communication Protocol Matrix\n"
            "| Interaction Type | Recommended Protocol | Technology | Rationale |\n"
            "| :--- | :--- | :--- | :--- |\n"
            "| Client to Backend | HTTPS / WSS | REST + OpenAPI / SSE | Universal browser compatibility & streaming |\n"
            "| Service to Service (Sync) | Binary RPC | gRPC + Protocol Buffers | 7x higher throughput, strict type contracts |\n"
            "| Service to Service (Async) | Event Pub/Sub | Apache Kafka / Redis Streams | Decoupled event broadcasting with replay |\n\n"
            "### Resilience: Circuit Breaker Pattern\n"
            "```python\n"
            "# Example Envoy / PyBreaker pattern for remote dependency calls\n"
            "from pybreaker import CircuitBreaker\n"
            "db_breaker = CircuitBreaker(fail_max=5, reset_timeout=30)\n"
            "\n"
            "@db_breaker\n"
            "async def call_remote_graph_service(project_id: int):\n"
            "    return await client.get(f'/internal/graph/{project_id}')\n"
            "```"
        )

    if any(k in msg_lower for k in ["database", "postgres", "sql", "index", "neon", "schema"]):
        return (
            "## 🗄 Database Design & Query Optimization\n\n"
            "ArchScale Nexus utilizes an asynchronous PostgreSQL data tier with optimized relational schemas:\n\n"
            "### Performance Best Practices\n"
            "1. **B-Tree & Composite Indexes**:\n"
            "   - Ensure composite indexes on foreign keys: `CREATE INDEX ix_tasks_project_status ON tasks (project_id, status);`\n"
            "   - Index user identification coordinates: `CREATE UNIQUE INDEX ix_users_username ON users (username);`\n"
            "2. **Connection Pooling Configuration**:\n"
            "   ```python\n"
            "   engine = create_async_engine(\n"
            "       settings.database_url,\n"
            "       pool_size=20,\n"
            "       max_overflow=10,\n"
            "       pool_pre_ping=True,\n"
            "       connect_args={'statement_cache_size': 0} # Required for PgBouncer / Neon\n"
            "   )\n"
            "   ```\n"
            "3. **Zero-Downtime Migration Pattern**:\n"
            "   - Add nullable columns first (`mobile_no VARCHAR(30) NULL`).\n"
            "   - Backfill data in micro-batches.\n"
            "   - Apply NOT NULL / UNIQUE constraints concurrently to prevent table locks."
        )

    if any(k in msg_lower for k in ["security", "auth", "jwt", "owasp", "rbac", "zero-trust"]):
        return (
            "## 🛡 Security Architecture & Zero-Trust Best Practices\n\n"
            "ArchScale Nexus adheres to defense-in-depth security standards:\n\n"
            "### Core Security Controls\n"
            "1. **Cryptographic Token Lifecycle**:\n"
            "   - Short-lived Access Tokens (15 min) signed with HS256/RS256.\n"
            "   - Long-lived Rotating Refresh Tokens (7 days) stored hashed with SHA-256 (`refresh_token_hash`). Revoked on password change.\n"
            "2. **Role-Based Access Control (RBAC)**:\n"
            "   - Enforces 11 discrete roles with explicit capability whitelists (e.g. `manage_users`, `manage_approvals`, `view_analytics`).\n"
            "3. **OWASP Mitigation Checklist**:\n"
            "   - **SQL Injection**: Prevented via SQLAlchemy 2.0 parameterized expressions.\n"
            "   - **Rate Limiting**: Sliding window rate limiter protects endpoints against brute-force and credential stuffing.\n"
            "   - **Input Sanitization**: Pydantic v2 strict typing and field-length constraints on all API payloads.\n"
            "   - **Zero-Trust Networking**: TLS 1.3 enforced for all transport layers; CORS headers restricted to verified domains."
        )

    if any(k in msg_lower for k in ["devops", "pipeline", "ci/cd", "docker", "deploy", "kubernetes"]):
        return (
            "## 🚀 DevOps & Continuous Delivery Pipeline\n\n"
            "A modern GitOps delivery workflow for ArchScale Nexus:\n\n"
            "```text\n"
            "+------------+      +-------------------+      +------------------+      +------------------+\n"
            "|  git push  | ---> |   GitHub Actions  | ---> |  Container Reg   | ---> |  ArgoCD (GitOps) |\n"
            "|   (main)   |      |  - pytest & lint  |      |  Docker Hub /    |      |  - Sync K8s Pods |\n"
            "|            |      |  - next build test|      |  GitHub Packages |      |  - Canary Rollout|\n"
            "+------------+      +-------------------+      +------------------+      +------------------+\n"
            "```\n\n"
            "### Multi-Stage Dockerfile Blueprint\n"
            "```dockerfile\n"
            "# Production Backend Container\n"
            "FROM python:3.12-slim AS builder\n"
            "WORKDIR /app\n"
            "RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev\n"
            "COPY requirements.txt .\n"
            "RUN pip install --user --no-cache-dir -r requirements.txt\n"
            "\n"
            "FROM python:3.12-slim\n"
            "WORKDIR /app\n"
            "COPY --from=builder /root/.local /root/.local\n"
            "COPY . .\n"
            "ENV PATH=/root/.local/bin:$PATH\n"
            "EXPOSE 8000\n"
            "CMD [\"uvicorn\", \"app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n"
            "```"
        )

    # General / Context-Aware default answer
    return (
        f"## 💡 Architecture & System Analysis\n\n"
        f"Regarding your query on **`{current_page}`**:\n\n"
        f"ArchScale Nexus coordinates multi-disciplinary trades through a unified reactive pipeline.\n\n"
        f"### Key Architectural Recommendations\n"
        f"1. **Decoupled Data Flow**: Maintain separation between synchronous user commands and asynchronous coordination calculations.\n"
        f"2. **State Consistency**: Ensure state mutations on `{current_page}` trigger cache invalidation so the Knowledge Graph and Impact Engine reflect live truth.\n"
        f"3. **Telemetry & Observability**: Monitor API response times, database query execution plans, and WebSocket heartbeat health.\n\n"
        f"```text\n"
        f"[User Action: {current_page}] --> [FastAPI REST / WSS] --> [PostgreSQL / Cache]\n"
        f"                                        |\n"
        f"                                        v\n"
        f"                           [AI Assistant Inference Stream]\n"
        f"```\n\n"
        f"Feel free to ask me to analyze bottlenecks, explain microservice schemas, or generate scaling configurations for ArchScale Nexus!"
    )


async def chat_stream_generator(
    db: AsyncSession,
    message: str,
    session: AIAssistantSession,
    current_page: str,
    project_id: int | None,
    client_id: str,
) -> AsyncGenerator[str, None]:
    """
    Core streaming generator:
    1. Validates rate limit and admin enabled switch.
    2. Gathers project metadata.
    3. Streams response tokens via OpenAI API or rich fallback engine.
    4. Records user message, assistant response, and usage analytics in database.
    """
    start_time = time.time()

    # 1. Check Admin Configuration
    config = await get_or_create_config(db)
    if not config.is_enabled:
        yield json.dumps({
            "type": "error",
            "content": "The AI Assistant is currently disabled by the system administrator.",
        })
        return

    # 2. Check Rate Limit
    allowed, retry_after = check_rate_limit(client_id, config.rate_limit_per_minute)
    if not allowed:
        yield json.dumps({
            "type": "error",
            "content": f"Rate limit exceeded. Please wait {retry_after} seconds before asking another question.",
        })
        return

    # 3. Gather Context
    project_context = await gather_project_context(db, project_id, current_page)

    # 4. Save User Message
    user_msg = AIAssistantMessage(
        session_id=session.id,
        role="user",
        content=message,
        tokens_used=len(message.split()),
        model_used=config.model_name,
        page_context=current_page,
    )
    db.add(user_msg)
    await db.commit()

    # Update session title if first exchange
    if session.title == "New Architecture Conversation" or session.title == "Architecture Discussion":
        title_snippet = message[:40].strip() + ("..." if len(message) > 40 else "")
        session.title = title_snippet
        session.current_page = current_page
        await db.commit()

    # 5. Execute Streaming Inference
    settings = get_settings()
    full_response_text = ""
    used_openai = False

    if settings.openai_api_key and settings.openai_api_key.strip():
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.openai_api_key.strip())

            # Build conversation history
            messages_payload = [
                {"role": "system", "content": f"{config.system_prompt}\n\nProject & Environment Context:\n{project_context}"}
            ]

            # Fetch recent 6 messages for context
            recent_msgs_stmt = (
                select(AIAssistantMessage)
                .where(AIAssistantMessage.session_id == session.id)
                .order_by(AIAssistantMessage.id.desc())
                .limit(6)
            )
            r_res = await db.execute(recent_msgs_stmt)
            recent_msgs = list(reversed(r_res.scalars().all()))

            for m in recent_msgs:
                messages_payload.append({"role": m.role, "content": m.content})

            stream = await client.chat.completions.create(
                model=config.model_name or "gpt-4o-mini",
                messages=messages_payload,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                stream=True,
            )

            async for chunk in stream:
                token = chunk.choices[0].delta.content if chunk.choices else ""
                if token:
                    full_response_text += token
                    yield json.dumps({"type": "token", "content": token})

            used_openai = True
        except Exception as e:
            # If OpenAI fails or quota exceeded, fall through to high-fidelity domain engine
            yield json.dumps({"type": "status", "content": "Routing to local architecture reasoning engine..."})

    if not used_openai:
        # High-fidelity domain architectural fallback engine
        generated = _generate_architectural_response(message, current_page, project_context)
        # Simulate realistic word-by-word streaming
        words = generated.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            full_response_text += chunk
            yield json.dumps({"type": "token", "content": chunk})
            await asyncio.sleep(0.015)  # 15ms per token for smooth streaming animation

    elapsed_ms = (time.time() - start_time) * 1000.0
    tokens_prompt = len(message.split()) + len(project_context.split())
    tokens_completion = len(full_response_text.split())
    tokens_total = tokens_prompt + tokens_completion

    # 6. Save Assistant Message in DB
    assistant_msg = AIAssistantMessage(
        session_id=session.id,
        role="assistant",
        content=full_response_text,
        tokens_used=tokens_completion,
        model_used=config.model_name if used_openai else "nexus-architecture-engine",
        page_context=current_page,
    )
    db.add(assistant_msg)

    # 7. Log Usage Analytics
    usage_entry = AIAssistantUsage(
        user_id=session.user_id,
        session_id=session.id,
        endpoint="chat_stream",
        tokens_prompt=tokens_prompt,
        tokens_completion=tokens_completion,
        tokens_total=tokens_total,
        page_route=current_page,
        response_time_ms=elapsed_ms,
    )
    db.add(usage_entry)
    await db.commit()

    # 8. Send completion event
    yield json.dumps({
        "type": "done",
        "session_uuid": session.session_uuid,
        "message_id": assistant_msg.id,
        "tokens_total": tokens_total,
        "response_time_ms": round(elapsed_ms, 2),
    })


async def get_usage_statistics(db: AsyncSession) -> dict[str, Any]:
    """Calculate aggregated usage metrics for the Admin Dashboard."""
    total_sessions = await db.scalar(select(func.count(AIAssistantSession.id))) or 0
    total_messages = await db.scalar(select(func.count(AIAssistantMessage.id))) or 0
    total_tokens = await db.scalar(select(func.sum(AIAssistantUsage.tokens_total))) or 0
    avg_latency = await db.scalar(select(func.avg(AIAssistantUsage.response_time_ms))) or 0.0

    # Popular routes
    route_stmt = (
        select(AIAssistantUsage.page_route, func.count(AIAssistantUsage.id).label("count"))
        .group_by(AIAssistantUsage.page_route)
        .order_by(desc("count"))
        .limit(6)
    )
    route_res = await db.execute(route_stmt)
    popular_routes = [{"route": r[0] or "/", "count": r[1]} for r in route_res.all()]

    # Daily usage for the past 7 days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    daily_stmt = (
        select(
            func.date(AIAssistantUsage.created_at).label("date"),
            func.count(AIAssistantUsage.id).label("queries"),
            func.sum(AIAssistantUsage.tokens_total).label("tokens"),
        )
        .where(AIAssistantUsage.created_at >= seven_days_ago)
        .group_by("date")
        .order_by("date")
    )
    daily_res = await db.execute(daily_stmt)
    daily_usage = [
        {"date": str(d[0]), "queries": d[1], "tokens": d[2] or 0} for d in daily_res.all()
    ]

    return {
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "total_tokens": total_tokens,
        "avg_latency_ms": round(avg_latency, 2),
        "popular_routes": popular_routes,
        "daily_usage": daily_usage,
    }


async def get_admin_conversations(
    db: AsyncSession, query: str | None = None, limit: int = 50, offset: int = 0
) -> tuple[list[dict[str, Any]], int]:
    """Retrieve all conversations for admin auditing and monitoring."""
    stmt = (
        select(
            AIAssistantSession,
            User.full_name,
            User.email,
            func.count(AIAssistantMessage.id).label("msg_count"),
            func.coalesce(func.sum(AIAssistantMessage.tokens_used), 0).label("tot_tokens"),
        )
        .outerjoin(User, AIAssistantSession.user_id == User.id)
        .outerjoin(AIAssistantMessage, AIAssistantSession.id == AIAssistantMessage.session_id)
        .group_by(AIAssistantSession.id, User.full_name, User.email)
        .order_by(desc(AIAssistantSession.updated_at))
    )

    if query:
        stmt = stmt.where(
            (AIAssistantSession.title.ilike(f"%{query}%"))
            | (User.full_name.ilike(f"%{query}%"))
            | (User.email.ilike(f"%{query}%"))
        )

    count_stmt = select(func.count(AIAssistantSession.id))
    total_count = await db.scalar(count_stmt) or 0

    stmt = stmt.limit(limit).offset(offset)
    res = await db.execute(stmt)
    rows = res.all()

    conversations = []
    for s, user_name, user_email, msg_count, tot_tokens in rows:
        conversations.append({
            "id": s.id,
            "session_uuid": s.session_uuid,
            "user_name": user_name or "Guest User",
            "user_email": user_email or "guest@archscale.io",
            "title": s.title,
            "current_page": s.current_page,
            "message_count": msg_count,
            "total_tokens": tot_tokens,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        })

    return conversations, total_count
