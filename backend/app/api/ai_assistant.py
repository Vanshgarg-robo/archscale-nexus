from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.database import get_db
from app.deps import get_current_user_optional, get_current_user
from app.models.user import User
from app.schemas.ai_assistant import (
    ChatRequest,
    ChatResponse,
    ChatMessageResponse,
    AIAssistantSessionResponse,
    AIAssistantSessionDetail,
    AIAssistantConfigResponse,
    AIAssistantConfigUpdate,
    AIAssistantPublicConfig,
    AIAssistantUsageStats,
    AIAssistantConversationSummary,
)
from app.services import ai_assistant_service

router = APIRouter(prefix="/api/ai-assistant", tags=["AI Assistant"])


@router.get("/config", response_model=AIAssistantPublicConfig)
async def get_public_config(db: AsyncSession = Depends(get_db)):
    """Public endpoint to check if the AI assistant is enabled and get prompt hints."""
    config = await ai_assistant_service.get_or_create_config(db)
    suggested = [
        "Explain ArchScale Nexus architecture & data flow",
        "How can we scale microservices on Kubernetes with HPA?",
        "What are the best practices for PostgreSQL indexing & PgBouncer?",
        "Recommend zero-trust security & mTLS patterns",
        "Analyze coordination bottlenecks on this page",
    ]
    return AIAssistantPublicConfig(
        is_enabled=config.is_enabled,
        model_name=config.model_name,
        suggested_prompts=suggested,
    )


@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """
    Streaming SSE endpoint for real-time AI architectural reasoning.
    Yields data: {...} events compatible with EventSource / fetch stream.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    client_id = f"user_{user.id}" if user else f"ip_{client_ip}"

    # Get or create session
    session = await ai_assistant_service.get_or_create_session(
        db=db,
        session_uuid=body.session_id,
        user_id=user.id if user else None,
        current_page=body.current_page,
        project_id=body.project_id,
    )

    async def event_generator():
        # First send session initialization header
        import json
        init_payload = {
            "type": "init",
            "session_uuid": session.session_uuid,
            "title": session.title,
            "current_page": session.current_page,
        }
        yield f"data: {json.dumps(init_payload)}\n\n"

        async for chunk_json in ai_assistant_service.chat_stream_generator(
            db=db,
            message=body.message,
            session=session,
            current_page=body.current_page or "/",
            project_id=body.project_id,
            client_id=client_id,
        ):
            yield f"data: {chunk_json}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_non_stream(
    body: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """Non-streaming fallback chat endpoint."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    client_id = f"user_{user.id}" if user else f"ip_{client_ip}"

    session = await ai_assistant_service.get_or_create_session(
        db=db,
        session_uuid=body.session_id,
        user_id=user.id if user else None,
        current_page=body.current_page,
        project_id=body.project_id,
    )

    import json
    import time
    start = time.time()
    full_text = ""
    tokens_total = 0

    async for chunk_str in ai_assistant_service.chat_stream_generator(
        db=db,
        message=body.message,
        session=session,
        current_page=body.current_page or "/",
        project_id=body.project_id,
        client_id=client_id,
    ):
        try:
            data = json.loads(chunk_str)
            if data.get("type") == "token":
                full_text += data.get("content", "")
            elif data.get("type") == "done":
                tokens_total = data.get("tokens_total", 0)
            elif data.get("type") == "error":
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=data.get("content"))
        except json.JSONDecodeError:
            pass

    elapsed = (time.time() - start) * 1000.0

    return ChatResponse(
        session_uuid=session.session_uuid,
        message=ChatMessageResponse(
            id=0,
            role="assistant",
            content=full_text,
            tokens_used=tokens_total,
            model_used="nexus-architecture-engine",
            page_context=body.current_page,
            created_at=session.updated_at,
        ),
        tokens_total=tokens_total,
        response_time_ms=round(elapsed, 2),
    )


@router.get("/sessions", response_model=list[AIAssistantSessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """List conversation sessions for current user."""
    sessions = await ai_assistant_service.list_user_sessions(db, user.id if user else None)
    return sessions


@router.post("/sessions", response_model=AIAssistantSessionResponse)
async def create_session(
    current_page: str = Query("/", alias="page"),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """Create a new blank conversation session."""
    session = await ai_assistant_service.get_or_create_session(
        db=db,
        session_uuid=None,
        user_id=user.id if user else None,
        current_page=current_page,
    )
    return AIAssistantSessionResponse(
        id=session.id,
        session_uuid=session.session_uuid,
        title=session.title,
        current_page=session.current_page,
        message_count=0,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.get("/sessions/{session_uuid}", response_model=AIAssistantSessionDetail)
async def get_session_detail(
    session_uuid: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch complete message history for a specific session."""
    session = await ai_assistant_service.get_session_by_uuid(db, session_uuid)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    messages_data = [
        ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            tokens_used=m.tokens_used,
            model_used=m.model_used,
            page_context=m.page_context,
            created_at=m.created_at,
        )
        for m in session.messages
    ]

    return AIAssistantSessionDetail(
        id=session.id,
        session_uuid=session.session_uuid,
        title=session.title,
        current_page=session.current_page,
        messages=messages_data,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.delete("/sessions/{session_uuid}")
async def delete_session_endpoint(
    session_uuid: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation session."""
    deleted = await ai_assistant_service.delete_session(db, session_uuid)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return {"message": "Session deleted successfully"}


# ─── ADMIN ENDPOINTS ──────────────────────────────────────────────────

@router.get("/admin/config", response_model=AIAssistantConfigResponse)
async def get_admin_config(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Admin endpoint to retrieve the complete AI Assistant configuration."""
    if user.role != "admin" and not user.is_superadmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    config = await ai_assistant_service.get_or_create_config(db)
    return config


@router.put("/admin/config", response_model=AIAssistantConfigResponse)
async def update_admin_config(
    body: AIAssistantConfigUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Admin endpoint to modify model, system prompt, rate limits, or master switch."""
    if user.role != "admin" and not user.is_superadmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    updated = await ai_assistant_service.update_config(db, body, user.id)
    return updated


@router.get("/admin/conversations")
async def get_admin_conversations_endpoint(
    search: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Admin endpoint to inspect all conversations across users."""
    if user.role != "admin" and not user.is_superadmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")

    conversations, total = await ai_assistant_service.get_admin_conversations(
        db, query=search, limit=limit, offset=offset
    )
    return {
        "conversations": conversations,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/admin/usage", response_model=AIAssistantUsageStats)
async def get_admin_usage_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Admin endpoint to monitor query volume, token usage, latency, and popular routes."""
    if user.role != "admin" and not user.is_superadmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")

    stats = await ai_assistant_service.get_usage_statistics(db)
    return stats
