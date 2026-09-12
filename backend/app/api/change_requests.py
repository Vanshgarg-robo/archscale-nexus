from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session
from app.models import ChangeRequest
from app.models.enums import ChangeRequestStatus
from app.schemas.change_request import ChangeRequestCreate, ChangeRequestRead, ChangeRequestUpdate
from app.services.change_request_service import submit_change_request, transition_status

router = APIRouter(prefix="/api/change-requests", tags=["change_requests"])


@router.get("/project/{project_id}")
async def list_change_requests(project_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.project_id == project_id))
    crs = result.scalars().all()
    return [
        {
            "id": cr.id,
            "title": cr.title,
            "description": cr.description,
            "reason": cr.reason,
            "status": cr.status.value,
            "affected_areas": cr.affected_areas,
            "impact_summary": cr.impact_summary,
            "estimated_delay_days": cr.estimated_delay_days,
            "risk_level": cr.risk_level,
            "created_at": cr.created_at.isoformat() if cr.created_at else None,
        }
        for cr in crs
    ]


@router.post("")
async def create_change_request(data: ChangeRequestCreate, db: AsyncSession = Depends(get_session)):
    return await submit_change_request(
        db, data.project_id, data.owner_id, data.title,
        data.description or "", data.reason or "", data.affected_areas,
    )


@router.patch("/{cr_id}/status")
async def update_cr_status(cr_id: int, data: ChangeRequestUpdate, db: AsyncSession = Depends(get_session)):
    if data.status:
        return await transition_status(db, cr_id, data.status)
    return {"error": "Status is required"}
