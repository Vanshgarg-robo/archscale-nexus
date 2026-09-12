from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.deps import get_session
from app.models import Task, Decision, ChangeRequest, ProjectStakeholder
from app.models.enums import TaskStatus
from app.services.health_service import calculate_health
from app.services.approval_service import get_pending_approvals
from app.services.blocker_service import detect_blockers
from app.services.risk_service import get_risk_summary

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/{project_id}")
async def get_dashboard(project_id: int, db: AsyncSession = Depends(get_session)):
    health = await calculate_health(db, project_id)
    pending_approvals = await get_pending_approvals(db, project_id)
    blockers = await detect_blockers(db, project_id)
    risk_summary = await get_risk_summary(db, project_id)

    decision_result = await db.execute(
        select(Decision).where(Decision.project_id == project_id).order_by(Decision.decided_at.desc()).limit(5)
    )
    decisions = decision_result.scalars().all()

    stakeholder_result = await db.execute(
        select(ProjectStakeholder).where(ProjectStakeholder.project_id == project_id)
    )
    assignments = stakeholder_result.scalars().all()

    total_tasks_result = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project_id)
    )
    total_tasks = total_tasks_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project_id, Task.status == TaskStatus.COMPLETED)
    )
    completed = completed_result.scalar() or 0

    in_progress_result = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project_id, Task.status == TaskStatus.IN_PROGRESS)
    )
    in_progress = in_progress_result.scalar() or 0

    blocked_result = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project_id, Task.status == TaskStatus.BLOCKED)
    )
    blocked = blocked_result.scalar() or 0

    cr_result = await db.execute(
        select(ChangeRequest).where(ChangeRequest.project_id == project_id).order_by(ChangeRequest.created_at.desc()).limit(5)
    )
    change_requests = cr_result.scalars().all()

    recommendations = _generate_recommendations(health, len(pending_approvals), len(blockers), risk_summary)

    return {
        "health": health,
        "pending_approvals": pending_approvals[:5],
        "blockers": [b.model_dump() for b in blockers[:5]],
        "risks": risk_summary,
        "recent_decisions": [
            {"id": d.id, "title": d.title, "rationale": d.rationale, "decided_by": d.decided_by_stakeholder.name if d.decided_by_stakeholder else None, "decided_at": d.decided_at.isoformat() if d.decided_at else None}
            for d in decisions
        ],
        "stakeholder_activity": [
            {"id": a.stakeholder.id, "name": a.stakeholder.name, "role": a.stakeholder.role.value, "influence_score": a.stakeholder.influence_score}
            for a in assignments
        ],
        "recommendations": recommendations,
        "task_summary": {
            "total": total_tasks,
            "completed": completed,
            "in_progress": in_progress,
            "blocked": blocked,
            "completion_rate": round((completed / total_tasks * 100) if total_tasks > 0 else 0, 1),
        },
        "change_requests": [
            {"id": cr.id, "title": cr.title, "status": cr.status.value, "risk_level": cr.risk_level}
            for cr in change_requests
        ],
    }


def _generate_recommendations(health: dict, pending_count: int, blocker_count: int, risk_summary: dict) -> list[str]:
    recs = []
    score = health.get("score", 100)

    if score < 50:
        recs.append("🔴 Project health is critical. Schedule an emergency coordination meeting with all key stakeholders.")

    if pending_count > 3:
        recs.append(f"⚠️ {pending_count} approvals are pending. Expedite reviews to prevent cascading delays.")

    if blocker_count > 0:
        recs.append(f"🚫 {blocker_count} active blockers detected. Prioritize resolution of critical blockers immediately.")

    critical_risks = risk_summary.get("by_severity", {}).get("critical", 0)
    if critical_risks > 0:
        recs.append(f"🔥 {critical_risks} critical risk(s) require immediate mitigation action.")

    if health.get("overdue_tasks", 0) > 0:
        recs.append(f"📅 {health['overdue_tasks']} tasks are overdue. Review timelines and reassign resources if needed.")

    if health.get("dependency_failures", 0) > 0:
        recs.append("🔗 Dependency chain failures detected. Review the dependency graph for bottlenecks.")

    if not recs:
        recs.append("✅ Project is on track. Continue monitoring key metrics and maintain stakeholder communication.")

    return recs
