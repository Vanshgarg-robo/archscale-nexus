from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session, get_current_user, verify_project_access, require_not_viewer
from app.models import Conversation, User
from app.schemas.ai import ConversationUpload
from app.services.ai_service import extract_from_conversation

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.post("/upload")
async def upload_conversation(
    data: ConversationUpload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    await verify_project_access(data.project_id, current_user, db)

    extracted = await extract_from_conversation(data.content, data.source_type)

    conversation = Conversation(
        project_id=data.project_id,
        source_type=data.source_type,
        title=data.title or f"{data.source_type} upload",
        raw_content=data.content,
        extracted_tasks=extracted.get("tasks", []),
        extracted_decisions=extracted.get("decisions", []),
        extracted_risks=extracted.get("risks", []),
        extracted_action_items=extracted.get("action_items", []),
        extracted_stakeholders=extracted.get("stakeholders", []),
        extracted_deadlines=extracted.get("deadlines", []),
        summary=extracted.get("summary", ""),
    )
    db.add(conversation)
    await db.commit()

    return {
        "id": conversation.id,
        "extraction": extracted,
    }


@router.get("/{project_id}")
async def list_conversations(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(project_id, current_user, db)
    result = await db.execute(
        select(Conversation)
        .where(Conversation.project_id == project_id)
        .order_by(Conversation.created_at.desc())
    )
    convs = result.scalars().all()
    return [
        {
            "id": c.id,
            "project_id": c.project_id,
            "source_type": c.source_type,
            "title": c.title,
            "raw_content": c.raw_content,
            "extracted_tasks": c.extracted_tasks or [],
            "extracted_decisions": c.extracted_decisions or [],
            "extracted_risks": c.extracted_risks or [],
            "extracted_action_items": c.extracted_action_items or [],
            "extracted_stakeholders": c.extracted_stakeholders or [],
            "extracted_deadlines": c.extracted_deadlines or [],
            "summary": c.summary or "",
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in convs
    ]
