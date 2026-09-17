from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_session, get_current_user, verify_project_access
from app.models.user import User
from app.schemas.ai import ImpactAnalysisRequest
from app.services.impact_service import analyze_impact

router = APIRouter(prefix="/api/impact", tags=["impact"])


@router.post("/analyze")
async def analyze(
    data: ImpactAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(data.project_id, current_user, db)
    result = await analyze_impact(db, data.project_id, data.change_description, data.affected_task_ids)
    return result.model_dump()
