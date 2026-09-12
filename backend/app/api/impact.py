from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_session
from app.schemas.ai import ImpactAnalysisRequest
from app.services.impact_service import analyze_impact

router = APIRouter(prefix="/api/impact", tags=["impact"])


@router.post("/analyze")
async def analyze(data: ImpactAnalysisRequest, db: AsyncSession = Depends(get_session)):
    result = await analyze_impact(db, data.project_id, data.change_description, data.affected_task_ids)
    return result.model_dump()
