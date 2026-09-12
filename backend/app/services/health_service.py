from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import Project, Task, Approval, Risk, HealthSnapshot
from app.models.enums import TaskStatus, ApprovalStatus, HealthStatus
from app.services.blocker_service import detect_blockers


async def calculate_health(db: AsyncSession, project_id: int) -> dict:
    overdue_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id == project_id,
            Task.status != TaskStatus.COMPLETED,
            Task.status != TaskStatus.CANCELLED,
            Task.due_date < func.now(),
        )
    )
    overdue_tasks = overdue_result.scalar() or 0

    pending_result = await db.execute(
        select(func.count(Approval.id)).where(
            Approval.project_id == project_id,
            Approval.status == ApprovalStatus.PENDING,
        )
    )
    pending_approvals = pending_result.scalar() or 0

    risk_result = await db.execute(
        select(func.count(Risk.id)).where(
            Risk.project_id == project_id,
            Risk.is_active == True,
        )
    )
    risk_count = risk_result.scalar() or 0

    blockers = await detect_blockers(db, project_id)
    blocker_count = len(blockers)

    blocked_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id == project_id,
            Task.status == TaskStatus.BLOCKED,
        )
    )
    dependency_failures = blocked_result.scalar() or 0

    score = 100.0
    score -= overdue_tasks * 8
    score -= pending_approvals * 4
    score -= blocker_count * 6
    score -= risk_count * 3
    score -= dependency_failures * 10
    score = max(0, min(100, score))

    if score >= 70:
        status = HealthStatus.HEALTHY
    elif score >= 40:
        status = HealthStatus.AT_RISK
    else:
        status = HealthStatus.CRITICAL

    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if project:
        project.health_score = score
        project.health_status = status

    snapshot = HealthSnapshot(
        project_id=project_id,
        score=score,
        status=status,
        overdue_tasks=overdue_tasks,
        pending_approvals=pending_approvals,
        blocker_count=blocker_count,
        risk_count=risk_count,
        dependency_failures=dependency_failures,
        metrics={
            "overdue_weight": overdue_tasks * 8,
            "approval_weight": pending_approvals * 4,
            "blocker_weight": blocker_count * 6,
            "risk_weight": risk_count * 3,
            "dependency_weight": dependency_failures * 10,
        },
    )
    db.add(snapshot)
    await db.flush()

    return {
        "project_id": project_id,
        "score": round(score, 1),
        "status": status.value,
        "overdue_tasks": overdue_tasks,
        "pending_approvals": pending_approvals,
        "blocker_count": blocker_count,
        "risk_count": risk_count,
        "dependency_failures": dependency_failures,
    }


async def get_health_history(db: AsyncSession, project_id: int, limit: int = 30) -> list[dict]:
    result = await db.execute(
        select(HealthSnapshot)
        .where(HealthSnapshot.project_id == project_id)
        .order_by(HealthSnapshot.created_at.desc())
        .limit(limit)
    )
    snapshots = result.scalars().all()

    return [
        {
            "score": s.score,
            "status": s.status.value,
            "overdue_tasks": s.overdue_tasks,
            "pending_approvals": s.pending_approvals,
            "blocker_count": s.blocker_count,
            "risk_count": s.risk_count,
            "dependency_failures": s.dependency_failures,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in reversed(snapshots)
    ]
