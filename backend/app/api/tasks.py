from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.deps import get_session, get_current_user, get_current_user_optional, verify_project_access, require_not_viewer
from app.models import Task, Approval, User
from app.models.enums import TaskStatus, ApprovalStatus
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate, TaskDecisionRequest
from app.services.progress_service import recalculate_and_save_project_progress
from app.services.audit_service import log_approval_activity

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

ALLOWED_APPROVAL_ROLES = {"admin", "project_manager", "architect", "client"}


def verify_approval_authority(user: User):
    if user.is_superadmin or user.role in ALLOWED_APPROVAL_ROLES:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Access denied: Role '{user.role}' is not authorized to approve or reject tasks.",
    )


def serialize_task(t: Task) -> TaskRead:
    data = {c.key: getattr(t, c.key) for c in Task.__table__.columns}
    data["assignee_name"] = t.assignee.name if t.assignee else None
    return TaskRead(**data)


@router.get("/project/{project_id}", response_model=list[TaskRead])
async def list_tasks(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    await verify_project_access(project_id, current_user, db)
    query = select(Task).where(Task.project_id == project_id)

    # Vendors and Contractors only see deliverables assigned to their stakeholder
    if current_user.role in ("vendor", "contractor") and not current_user.is_superadmin:
        query = query.where(Task.assignee_id == current_user.stakeholder_id)

    result = await db.execute(query.order_by(Task.id.asc()))
    tasks = result.scalars().all()
    return [serialize_task(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await verify_project_access(task.project_id, current_user, db)

    # If vendor or contractor, ensure task is assigned to their stakeholder
    if current_user.role in ("vendor", "contractor") and not current_user.is_superadmin:
        if task.assignee_id != current_user.stakeholder_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not assigned to this deliverable",
            )

    return serialize_task(task)


@router.post("", response_model=TaskRead)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    await verify_project_access(data.project_id, current_user, db)
    task = Task(**data.model_dump())
    db.add(task)
    await db.flush()

    # Recalculate progress for project
    await recalculate_and_save_project_progress(db, task.project_id)

    if current_user:
        await log_approval_activity(
            db=db,
            user=current_user,
            action="CREATED",
            task_id=task.id,
            task_title=task.title,
            previous_status="none",
            new_status=task.status.value,
            project_id=task.project_id,
        )

    await db.commit()
    return serialize_task(task)


@router.post("/{task_id}/submit", response_model=TaskRead)
async def submit_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await verify_project_access(task.project_id, current_user, db)

    prev_status = task.status.value if hasattr(task.status, "value") else str(task.status)
    task.status = TaskStatus.PENDING_APPROVAL
    task.updated_at = datetime.now(timezone.utc)

    # Check if an approval already exists for this task; if not, create one
    appr_res = await db.execute(
        select(Approval).where(
            Approval.related_task_id == task_id,
            Approval.status == ApprovalStatus.PENDING,
        )
    )
    existing_appr = appr_res.scalar_one_or_none()
    if not existing_appr:
        new_appr = Approval(
            project_id=task.project_id,
            related_task_id=task.id,
            requester_id=current_user.stakeholder_id or 1,
            approver_id=1,  # Default to admin / lead
            title=f"Approval Sign-off: {task.title}",
            description=task.description or f"Task #{task.id} submitted for governance approval.",
            status=ApprovalStatus.PENDING,
            approval_type="task_deliverable",
            due_date=task.due_date,
        )
        db.add(new_appr)

    await log_approval_activity(
        db=db,
        user=current_user,
        action="SUBMITTED",
        task_id=task.id,
        task_title=task.title,
        previous_status=prev_status,
        new_status=task.status.value,
        project_id=task.project_id,
    )

    await recalculate_and_save_project_progress(db, task.project_id)
    await db.commit()
    return serialize_task(task)


@router.post("/{task_id}/approve", response_model=TaskRead)
async def approve_task(
    task_id: int,
    data: TaskDecisionRequest = TaskDecisionRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    verify_approval_authority(current_user)

    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await verify_project_access(task.project_id, current_user, db)

    now = datetime.now(timezone.utc)
    prev_status = task.status.value if hasattr(task.status, "value") else str(task.status)

    # Update task attributes
    task.status = TaskStatus.APPROVED
    task.progress = 100
    task.approved_at = now
    task.approved_by_id = current_user.id
    task.approved_by_name = current_user.full_name
    task.completed_at = now
    task.rejected_at = None
    task.rejection_reason = None
    task.rejection_comments = None
    task.updated_at = now

    # Synchronize linked approvals
    appr_res = await db.execute(
        select(Approval).where(Approval.related_task_id == task_id)
    )
    linked_approvals = appr_res.scalars().all()
    if linked_approvals:
        for a in linked_approvals:
            a.status = ApprovalStatus.APPROVED
            a.decided_at = now
            a.decided_by_id = current_user.id
            a.decided_by_name = current_user.full_name
            if data.notes:
                a.notes = data.notes
    else:
        # Create completed approval record to preserve history
        completed_appr = Approval(
            project_id=task.project_id,
            related_task_id=task.id,
            requester_id=current_user.stakeholder_id or 1,
            approver_id=current_user.stakeholder_id or 1,
            title=f"Sign-off: {task.title}",
            status=ApprovalStatus.APPROVED,
            approval_type="task_deliverable",
            decided_at=now,
            decided_by_id=current_user.id,
            decided_by_name=current_user.full_name,
            notes=data.notes,
        )
        db.add(completed_appr)

    # Recalculate project completion percentage automatically
    await recalculate_and_save_project_progress(db, task.project_id)

    # Log audit event
    await log_approval_activity(
        db=db,
        user=current_user,
        action="APPROVED",
        task_id=task.id,
        task_title=task.title,
        previous_status=prev_status,
        new_status=task.status.value,
        project_id=task.project_id,
        comments=data.notes,
    )

    await db.commit()
    return serialize_task(task)


@router.post("/{task_id}/reject", response_model=TaskRead)
async def reject_task(
    task_id: int,
    data: TaskDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    verify_approval_authority(current_user)

    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await verify_project_access(task.project_id, current_user, db)

    now = datetime.now(timezone.utc)
    prev_status = task.status.value if hasattr(task.status, "value") else str(task.status)

    # Update task attributes
    task.status = TaskStatus.REJECTED
    task.rejected_at = now
    task.rejected_by_id = current_user.id
    task.rejected_by_name = current_user.full_name
    task.rejection_reason = data.reason or "Needs revision"
    task.rejection_comments = data.comments or data.notes
    task.updated_at = now

    # Synchronize linked approvals
    appr_res = await db.execute(
        select(Approval).where(Approval.related_task_id == task_id)
    )
    linked_approvals = appr_res.scalars().all()
    if linked_approvals:
        for a in linked_approvals:
            a.status = ApprovalStatus.REJECTED
            a.decided_at = now
            a.decided_by_id = current_user.id
            a.decided_by_name = current_user.full_name
            a.rejection_reason = data.reason or "Needs revision"
            a.notes = data.comments or data.notes or data.reason
    else:
        # Create rejected approval record to preserve history
        rejected_appr = Approval(
            project_id=task.project_id,
            related_task_id=task.id,
            requester_id=current_user.stakeholder_id or 1,
            approver_id=current_user.stakeholder_id or 1,
            title=f"Sign-off: {task.title}",
            status=ApprovalStatus.REJECTED,
            approval_type="task_deliverable",
            decided_at=now,
            decided_by_id=current_user.id,
            decided_by_name=current_user.full_name,
            rejection_reason=data.reason,
            notes=data.comments or data.notes or data.reason,
        )
        db.add(rejected_appr)

    # Recalculate project completion percentage automatically
    await recalculate_and_save_project_progress(db, task.project_id)

    # Log audit event
    await log_approval_activity(
        db=db,
        user=current_user,
        action="REJECTED",
        task_id=task.id,
        task_title=task.title,
        previous_status=prev_status,
        new_status=task.status.value,
        project_id=task.project_id,
        reason=data.reason,
        comments=data.comments or data.notes,
    )

    await db.commit()
    return serialize_task(task)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await verify_project_access(task.project_id, current_user, db)

    prev_status = task.status.value if hasattr(task.status, "value") else str(task.status)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(task, key, value)

    # If status transitioned to APPROVED or REJECTED
    if data.status and data.status != prev_status:
        now = datetime.now(timezone.utc)
        if data.status == TaskStatus.APPROVED:
            if current_user:
                verify_approval_authority(current_user)
                task.approved_by_id = current_user.id
                task.approved_by_name = current_user.full_name
            task.approved_at = now
            task.progress = 100
            task.completed_at = now
        elif data.status == TaskStatus.REJECTED:
            if current_user:
                verify_approval_authority(current_user)
                task.rejected_by_id = current_user.id
                task.rejected_by_name = current_user.full_name
            task.rejected_at = now

        if current_user:
            await log_approval_activity(
                db=db,
                user=current_user,
                action="APPROVED" if data.status == TaskStatus.APPROVED else ("REJECTED" if data.status == TaskStatus.REJECTED else "UPDATED"),
                task_id=task.id,
                task_title=task.title,
                previous_status=prev_status,
                new_status=task.status.value,
                project_id=task.project_id,
            )

    await recalculate_and_save_project_progress(db, task.project_id)
    await db.commit()
    return serialize_task(task)
