from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_session, get_current_user, verify_project_access
from app.models.user import User
from app.services.blocker_service import detect_blockers

router = APIRouter(prefix="/api/blockers", tags=["blockers"])


@router.get("/{project_id}")
async def list_blockers(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(project_id, current_user, db)
    blockers = await detect_blockers(db, project_id)
    return [b.model_dump() for b in blockers]
