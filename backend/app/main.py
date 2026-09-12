from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base
from app.api import projects, stakeholders, tasks, dependencies, approvals
from app.api import change_requests, risks, health, notifications
from app.api import impact, blockers, conversations, ai_chat, graph, dashboard, memory, demo
from app.api import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
app.include_router(memory.router)
app.include_router(demo.router)


@app.get("/api/ping")
async def ping():
    return {"status": "ok", "service": "ArchScale Nexus API"}
