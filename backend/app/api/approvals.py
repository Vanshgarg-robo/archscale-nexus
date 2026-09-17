from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.deps import get_session, get_current_user, get_current_user_optional
from app.models import Approval, Task, User
from app.models.enums import ApprovalStatus, TaskStatus
from app.schemas.approval import ApprovalCreate, ApprovalRead, ApprovalUpdate, ApprovalDecisionRequest
from app.services.approval_service import get_pending_approvals, get_overdue_approvals, get_approval_history
from app.services.progress_service import recalculate_and_save_project_progress
from app.services.audit_service import log_approval_activity

router = APIRouter(prefix="/api/approvals", tags=["approvals"])

ALLOWED_APPROVAL_ROLES = {"admin", "project_manager", "architect", "client"}


def verify_approval_authority(user: User):
    if user.is_superadmin or user.role in ALLOWED_APPROVAL_ROLES:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Access denied: Role '{user.role}' is not authorized to approve or reject tasks or governance decisions.",
    )


@router.get("/pending/{project_id}")
async def pending_approvals(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    from app.deps import verify_project_access
    await verify_project_access(project_id, current_user, db)
    return await get_pending_approvals(db, project_id)


@router.get("/overdue/{project_id}")
async def overdue_approvals(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    from app.deps import verify_project_access
    await verify_project_access(project_id, current_user, db)
    return await get_overdue_approvals(db, project_id)


@router.get("/history/{project_id}")
async def approval_history(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    from app.deps import verify_project_access
    await verify_project_access(project_id, current_user, db)
    return await get_approval_history(db, project_id)


@router.post("/{approval_id}/decide")
async def decide_approval(
    approval_id: int,
    data: ApprovalDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    from app.deps import verify_project_access, require_not_viewer
    require_not_viewer(current_user)
    verify_approval_authority(current_user)

    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    await verify_project_access(approval.project_id, current_user, db)

    now = datetime.now(timezone.utc)
    target_status = data.status.lower()
    if target_status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Decision status must be 'approved' or 'rejected'")

    # 1. Update Approval record
    approval.status = ApprovalStatus.APPROVED if target_status == "approved" else ApprovalStatus.REJECTED
    approval.decided_at = now
    approval.decided_by_id = current_user.id
    approval.decided_by_name = current_user.full_name
    if data.reason:
        approval.rejection_reason = data.reason
    if data.notes or data.reason:
        approval.notes = data.notes or data.reason

    # 2. Synchronize related task if linked
    task = None
    if approval.related_task_id:
        task_res = await db.execute(select(Task).where(Task.id == approval.related_task_id))
        task = task_res.scalar_one_or_none()
        if task:
            prev_status = task.status.value if hasattr(task.status, "value") else str(task.status)
            if target_status == "approved":
                task.status = TaskStatus.APPROVED
                task.progress = 100
                task.approved_at = now
                task.approved_by_id = current_user.id
                task.approved_by_name = current_user.full_name
                task.completed_at = now
                task.rejected_at = None
                task.rejection_reason = None
                task.rejection_comments = None
            else:
                task.status = TaskStatus.REJECTED
                task.rejected_at = now
                task.rejected_by_id = current_user.id
                task.rejected_by_name = current_user.full_name
                task.rejection_reason = data.reason or "Needs revision"
                task.rejection_comments = data.notes

            task.updated_at = now

            # 3. Log activity
            await log_approval_activity(
                db=db,
                user=current_user,
                action=target_status.upper(),
                task_id=task.id,
                task_title=task.title,
                previous_status=prev_status,
                new_status=task.status.value,
                project_id=approval.project_id,
                reason=data.reason,
                comments=data.notes,
            )

    # 4. Automatically recalculate project completion
    progress = await recalculate_and_save_project_progress(db, approval.project_id)
    await db.commit()

    return {
        "id": approval.id,
        "status": approval.status.value,
        "decided_at": approval.decided_at.isoformat() if approval.decided_at else None,
        "decided_by_name": approval.decided_by_name,
        "rejection_reason": approval.rejection_reason,
        "related_task_id": approval.related_task_id,
        "task_status": task.status.value if task else None,
        "project_progress": progress,
    }


@router.patch("/{approval_id}")
async def update_approval(
    approval_id: int,
    data: ApprovalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    from app.deps import verify_project_access, require_not_viewer
    require_not_viewer(current_user)
    verify_approval_authority(current_user)

    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    await verify_project_access(approval.project_id, current_user, db)

    now = datetime.now(timezone.utc)
    if data.status:
        approval.status = data.status
        if data.status in (ApprovalStatus.APPROVED, ApprovalStatus.REJECTED):
            approval.decided_at = now
            approval.decided_by_id = current_user.id
            approval.decided_by_name = current_user.full_name
    if data.notes:
        approval.notes = data.notes
    if data.rejection_reason:
        approval.rejection_reason = data.rejection_reason

    # Synchronize task if decided
    task = None
    if approval.related_task_id and data.status in (ApprovalStatus.APPROVED, ApprovalStatus.REJECTED):
        task_res = await db.execute(select(Task).where(Task.id == approval.related_task_id))
        task = task_res.scalar_one_or_none()
        if task:
            prev_status = task.status.value if hasattr(task.status, "value") else str(task.status)
            if data.status == ApprovalStatus.APPROVED:
                task.status = TaskStatus.APPROVED
                task.progress = 100
                task.approved_at = now
                task.approved_by_id = current_user.id
                task.approved_by_name = current_user.full_name
                task.completed_at = now
            else:
                task.status = TaskStatus.REJECTED
                task.rejected_at = now
                task.rejected_by_id = current_user.id
                task.rejected_by_name = current_user.full_name
                task.rejection_reason = data.rejection_reason or "Needs revision"
                task.rejection_comments = data.notes

            task.updated_at = now

            await log_approval_activity(
                db=db,
                user=current_user,
                action="APPROVED" if data.status == ApprovalStatus.APPROVED else "REJECTED",
                task_id=task.id,
                task_title=task.title,
                previous_status=prev_status,
                new_status=task.status.value,
                project_id=approval.project_id,
                reason=data.rejection_reason,
                comments=data.notes,
            )

    progress = await recalculate_and_save_project_progress(db, approval.project_id)
    await db.commit()

    return {
        "id": approval.id,
        "status": approval.status.value,
        "decided_at": approval.decided_at.isoformat() if approval.decided_at else None,
        "decided_by_name": approval.decided_by_name,
        "related_task_id": approval.related_task_id,
        "project_progress": progress,
    }


@router.post("")
async def create_approval(
    data: ApprovalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    from app.deps import verify_project_access, require_not_viewer
    require_not_viewer(current_user)
    await verify_project_access(data.project_id, current_user, db)

    approval = Approval(**data.model_dump())
    db.add(approval)
    await db.commit()
    return {"id": approval.id, "title": approval.title, "status": approval.status.value}
