from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_session, get_current_user, verify_project_access
from app.models.user import User
from app.services.health_service import calculate_health, get_health_history

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/{project_id}")
async def current_health(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(project_id, current_user, db)
    return await calculate_health(db, project_id)


@router.get("/history/{project_id}")
async def health_history(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(project_id, current_user, db)
    return await get_health_history(db, project_id)
