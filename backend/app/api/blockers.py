from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_session
from app.services.blocker_service import detect_blockers

router = APIRouter(prefix="/api/blockers", tags=["blockers"])


@router.get("/{project_id}")
async def list_blockers(project_id: int, db: AsyncSession = Depends(get_session)):
    blockers = await detect_blockers(db, project_id)
    return [b.model_dump() for b in blockers]
