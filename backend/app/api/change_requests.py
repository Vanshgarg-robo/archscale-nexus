from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session, get_current_user, verify_project_access, require_not_viewer
from app.models import ChangeRequest, User
from app.models.enums import ChangeRequestStatus
from app.schemas.change_request import ChangeRequestCreate, ChangeRequestRead, ChangeRequestUpdate
from app.services.change_request_service import submit_change_request, transition_status

router = APIRouter(prefix="/api/change-requests", tags=["change_requests"])


@router.get("/project/{project_id}")
async def list_change_requests(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(project_id, current_user, db)
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
async def create_change_request(
    data: ChangeRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    await verify_project_access(data.project_id, current_user, db)
    return await submit_change_request(
        db, data.project_id, data.owner_id, data.title,
        data.description or "", data.reason or "", data.affected_areas,
    )


@router.patch("/{cr_id}/status")
async def update_cr_status(
    cr_id: int,
    data: ChangeRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    cr_res = await db.execute(select(ChangeRequest).where(ChangeRequest.id == cr_id))
    cr = cr_res.scalar_one_or_none()
    if not cr:
        raise HTTPException(status_code=404, detail="Change request not found")

    await verify_project_access(cr.project_id, current_user, db)

    if data.status:
        return await transition_status(db, cr_id, data.status)
    return {"error": "Status is required"}
