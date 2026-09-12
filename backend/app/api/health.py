from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_session
from app.services.health_service import calculate_health, get_health_history

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/{project_id}")
async def current_health(project_id: int, db: AsyncSession = Depends(get_session)):
    return await calculate_health(db, project_id)


@router.get("/history/{project_id}")
async def health_history(project_id: int, db: AsyncSession = Depends(get_session)):
    return await get_health_history(db, project_id)
