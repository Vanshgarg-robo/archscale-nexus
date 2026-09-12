from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.deps import get_session
from app.models import Approval
from app.models.enums import ApprovalStatus
from app.schemas.approval import ApprovalCreate, ApprovalRead, ApprovalUpdate
from app.services.approval_service import get_pending_approvals, get_overdue_approvals, get_approval_history

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


@router.get("/pending/{project_id}")
async def pending_approvals(project_id: int, db: AsyncSession = Depends(get_session)):
    return await get_pending_approvals(db, project_id)


@router.get("/overdue/{project_id}")
async def overdue_approvals(project_id: int, db: AsyncSession = Depends(get_session)):
    return await get_overdue_approvals(db, project_id)


@router.get("/history/{project_id}")
async def approval_history(project_id: int, db: AsyncSession = Depends(get_session)):
    return await get_approval_history(db, project_id)


@router.patch("/{approval_id}")
async def update_approval(approval_id: int, data: ApprovalUpdate, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Approval not found")

    if data.status:
        approval.status = data.status
        if data.status in (ApprovalStatus.APPROVED, ApprovalStatus.REJECTED):
            approval.decided_at = datetime.now(timezone.utc)
    if data.notes:
        approval.notes = data.notes
    await db.flush()

    return {"id": approval.id, "status": approval.status.value, "decided_at": approval.decided_at}


@router.post("")
async def create_approval(data: ApprovalCreate, db: AsyncSession = Depends(get_session)):
    approval = Approval(**data.model_dump())
    db.add(approval)
    await db.flush()
    return {"id": approval.id, "title": approval.title, "status": approval.status.value}
