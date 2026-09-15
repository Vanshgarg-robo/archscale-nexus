from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base
from app.api import projects, stakeholders, tasks, dependencies, approvals
from app.api import change_requests, risks, health, notifications
from app.api import impact, blockers, conversations, ai_chat, graph, dashboard, memory, demo, documents
from app.api import auth
from app.api import admin_users, admin_roles, admin_audit, admin_notifications, admin_dashboard
from app.api import ai_assistant


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Automatic column migration for existing tables
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)"))
        except Exception:
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(100)"))
            except Exception:
                pass
        try:
            await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(30)"))
        except Exception:
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN mobile_no VARCHAR(30)"))
            except Exception:
                pass

        # Project progress & client_id migrations
        project_cols = [
            ("client_id", "INTEGER"),
            ("overall_completion_pct", "FLOAT DEFAULT 0.0"),
            ("design_completion_pct", "FLOAT DEFAULT 0.0"),
            ("planning_completion_pct", "FLOAT DEFAULT 0.0"),
            ("execution_completion_pct", "FLOAT DEFAULT 0.0"),
            ("documentation_completion_pct", "FLOAT DEFAULT 0.0"),
        ]
        for col_name, col_type in project_cols:
            try:
                await conn.execute(text(f"ALTER TABLE projects ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
            except Exception:
                try:
                    await conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}"))
                except Exception:
                    pass

    from app.database import async_session
    from app.services.seed_service import seed_demo_data
    async with async_session() as session:
        try:
            result = await seed_demo_data(session)
            await session.commit()
        except Exception:
            await session.rollback()

    yield
    await engine.dispose()


settings = get_settings()

app = FastAPI(
    title="ArchScale Nexus",
    description="AI-powered Coordination Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(auth.direct_router)
app.include_router(projects.router)
app.include_router(stakeholders.router)
app.include_router(tasks.router)
app.include_router(dependencies.router)
app.include_router(approvals.router)
app.include_router(change_requests.router)
app.include_router(risks.router)
app.include_router(health.router)
app.include_router(notifications.router)
app.include_router(impact.router)
app.include_router(blockers.router)
app.include_router(conversations.router)
app.include_router(ai_chat.router)
app.include_router(graph.router)
app.include_router(dashboard.router)
app.include_router(documents.router)
app.include_router(memory.router)
app.include_router(demo.router)
app.include_router(admin_users.router)
app.include_router(admin_roles.router)
app.include_router(admin_audit.router)
app.include_router(admin_notifications.router)
app.include_router(admin_dashboard.router)
app.include_router(ai_assistant.router)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "ArchScale Nexus API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health": "/api/ping",
    }


@app.get("/api/ping")
async def ping():
    return {"status": "ok", "service": "ArchScale Nexus API"}
