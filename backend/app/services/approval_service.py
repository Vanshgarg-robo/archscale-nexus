from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.models import Approval
from app.models.enums import ApprovalStatus


async def get_pending_approvals(db: AsyncSession, project_id: int) -> list[dict]:
    result = await db.execute(
        select(Approval).where(
            Approval.project_id == project_id,
            Approval.status == ApprovalStatus.PENDING,
        )
    )
    approvals = result.scalars().all()

    pending = []
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for a in approvals:
        a_due = a.due_date.replace(tzinfo=None) if a.due_date and a.due_date.tzinfo else a.due_date
        is_overdue = a_due is not None and a_due < now
        days_overdue = (now - a_due).days if is_overdue and a_due else 0

        pending.append({
            "id": a.id,
            "title": a.title,
            "status": a.status.value,
            "approval_type": a.approval_type,
            "requester_name": a.requester.name if a.requester else "Unknown",
            "approver_name": a.approver.name if a.approver else "Unknown",
            "approver_id": a.approver_id,
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "is_overdue": is_overdue,
            "days_overdue": days_overdue,
            "related_task_id": a.related_task_id,
            "change_request_id": a.change_request_id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return sorted(pending, key=lambda x: (not x["is_overdue"], x.get("due_date") or "9999"))


async def get_overdue_approvals(db: AsyncSession, project_id: int) -> list[dict]:
    all_pending = await get_pending_approvals(db, project_id)
    return [a for a in all_pending if a["is_overdue"]]


async def get_approval_history(db: AsyncSession, project_id: int) -> list[dict]:
    result = await db.execute(
        select(Approval).where(
            Approval.project_id == project_id,
            Approval.status != ApprovalStatus.PENDING,
        )
    )
    approvals = result.scalars().all()

    history = []
    for a in approvals:
        approver_display = a.decided_by_name or (a.approver.name if a.approver else "Authorized Lead")
        history.append({
            "id": a.id,
            "title": a.title,
            "status": a.status.value,
            "approval_type": a.approval_type,
            "approver_name": approver_display,
            "decided_by_name": approver_display,
            "decided_at": a.decided_at.isoformat() if a.decided_at else None,
            "notes": a.notes,
            "rejection_reason": getattr(a, "rejection_reason", None),
            "related_task_id": a.related_task_id,
            "related_task_title": a.related_task.title if a.related_task else None,
        })

    return sorted(history, key=lambda x: x.get("decided_at") or "", reverse=True)


async def check_approval_blockers(db: AsyncSession, task_id: int) -> list[dict]:
    result = await db.execute(
        select(Approval).where(
            Approval.related_task_id == task_id,
            Approval.status == ApprovalStatus.PENDING,
        )
    )
    pending = result.scalars().all()

    return [
        {
            "approval_id": a.id,
            "title": a.title,
            "approver_name": a.approver.name if a.approver else "Unknown",
            "due_date": a.due_date.isoformat() if a.due_date else None,
        }
        for a in pending
    ]
