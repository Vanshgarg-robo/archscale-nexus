from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session
from app.models import Risk
from app.schemas.risk import RiskRead
from app.services.risk_service import get_risk_summary

router = APIRouter(prefix="/api/risks", tags=["risks"])


@router.get("/project/{project_id}")
async def list_risks(project_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Risk).where(Risk.project_id == project_id, Risk.is_active == True))
    risks = result.scalars().all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "category": r.category.value,
            "severity": r.severity.value,
            "probability": r.probability,
            "impact_score": r.impact_score,
            "risk_score": r.risk_score,
            "mitigation": r.mitigation,
            "owner_id": r.owner_id,
        }
        for r in risks
    ]


@router.get("/summary/{project_id}")
async def risk_summary(project_id: int, db: AsyncSession = Depends(get_session)):
    return await get_risk_summary(db, project_id)
