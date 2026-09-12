from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.models import Task, Approval, Issue, Dependency
from app.models.enums import TaskStatus, ApprovalStatus, IssueStatus, RelationshipType
from app.schemas.ai import BlockerAlert


async def detect_blockers(db: AsyncSession, project_id: int) -> list[BlockerAlert]:
    blockers = []
    blocker_id = 1

    approval_result = await db.execute(
        select(Approval).where(
            Approval.project_id == project_id,
            Approval.status == ApprovalStatus.PENDING,
        )
    )
    pending_approvals = approval_result.scalars().all()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    for a in pending_approvals:
        a_due = a.due_date.replace(tzinfo=None) if a.due_date and a.due_date.tzinfo else a.due_date
        is_overdue = a_due is not None and a_due < now
        if is_overdue or a.related_task_id:
            blockers.append(BlockerAlert(
                id=blocker_id,
                title=f"Approval Pending: {a.title}",
                blocker_type="missing_approval",
                reason=f"Approval from {a.approver.name if a.approver else 'Unknown'} is {'overdue' if is_overdue else 'pending'}",
                owner_name=a.approver.name if a.approver else None,
                owner_id=a.approver_id,
                affected_task_id=a.related_task_id,
                affected_task_title=a.related_task.title if a.related_task else None,
                severity="critical" if is_overdue else "high",
                created_at=a.created_at.isoformat() if a.created_at else None,
            ))
            blocker_id += 1

    task_result = await db.execute(
        select(Task).where(
            Task.project_id == project_id,
            Task.status != TaskStatus.COMPLETED,
            Task.status != TaskStatus.CANCELLED,
            Task.due_date < now,
        )
    )
    overdue_tasks = task_result.scalars().all()

    for t in overdue_tasks:
        t_due = t.due_date.replace(tzinfo=None) if t.due_date and t.due_date.tzinfo else t.due_date
        days_overdue = (now - t_due).days if t_due else 0
        blockers.append(BlockerAlert(
            id=blocker_id,
            title=f"Overdue Task: {t.title}",
            blocker_type="overdue_task",
            reason=f"Task is {days_overdue} days overdue",
            owner_name=t.assignee.name if t.assignee else None,
            owner_id=t.assignee_id,
            affected_task_id=t.id,
            affected_task_title=t.title,
            severity="critical" if days_overdue > 7 else "high",
            created_at=t.created_at.isoformat() if t.created_at else None,
        ))
        blocker_id += 1

    issue_result = await db.execute(
        select(Issue).where(
            Issue.project_id == project_id,
            Issue.status == IssueStatus.OPEN,
        )
    )
    open_issues = issue_result.scalars().all()

    for issue in open_issues:
        blockers.append(BlockerAlert(
            id=blocker_id,
            title=f"Unresolved Issue: {issue.title}",
            blocker_type="unresolved_issue",
            reason=f"Issue with {issue.severity.value} severity remains unresolved",
            affected_task_id=issue.related_task_id,
            severity=issue.severity.value,
            created_at=issue.created_at.isoformat() if issue.created_at else None,
        ))
        blocker_id += 1

    blocked_tasks_result = await db.execute(
        select(Task).where(
            Task.project_id == project_id,
            Task.status == TaskStatus.BLOCKED,
        )
    )
    blocked_tasks = blocked_tasks_result.scalars().all()

    for t in blocked_tasks:
        dep_result = await db.execute(
            select(Dependency).where(
                Dependency.source_id == t.id,
                Dependency.relationship_type == RelationshipType.DEPENDS_ON,
            )
        )
        deps = dep_result.scalars().all()

        for d in deps:
            if d.target_task and d.target_task.status != TaskStatus.COMPLETED:
                blockers.append(BlockerAlert(
                    id=blocker_id,
                    title=f"Dependency Blocked: {t.title}",
                    blocker_type="dependency_failure",
                    reason=f"Blocked by incomplete dependency: {d.target_task.title}",
                    owner_name=t.assignee.name if t.assignee else None,
                    owner_id=t.assignee_id,
                    affected_task_id=t.id,
                    affected_task_title=t.title,
                    severity="high",
                    created_at=t.created_at.isoformat() if t.created_at else None,
                ))
                blocker_id += 1

    return sorted(blockers, key=lambda b: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(b.severity, 4))
