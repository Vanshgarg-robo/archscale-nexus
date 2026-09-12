from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Task, Dependency, Stakeholder, Vendor, Approval, ProjectStakeholder
from app.models.enums import RelationshipType, ApprovalStatus, TaskStatus
from app.services.dependency_service import get_downstream_chain
from app.schemas.ai import ImpactAnalysisResponse


async def analyze_impact(
    db: AsyncSession, project_id: int, change_description: str, affected_task_ids: list[int]
) -> ImpactAnalysisResponse:
    affected_stakeholders = []
    affected_tasks = []
    affected_vendors = []
    affected_approvals = []
    blocked_work = []
    seen_stakeholder_ids = set()
    seen_task_ids = set()
    total_delay = 0

    for task_id in affected_task_ids:
        chain = await get_downstream_chain(db, task_id)

        for item in chain:
            tid = item["task_id"]
            if tid in seen_task_ids:
                continue
            seen_task_ids.add(tid)

            task_result = await db.execute(select(Task).where(Task.id == tid))
            task = task_result.scalar_one_or_none()
            if not task:
                continue

            affected_tasks.append({
                "id": task.id,
                "title": task.title,
                "status": task.status.value,
                "depth": item["depth"],
                "assignee": item.get("assignee_name"),
            })

            if task.assignee_id and task.assignee_id not in seen_stakeholder_ids:
                seen_stakeholder_ids.add(task.assignee_id)
                affected_stakeholders.append({
                    "id": task.assignee_id,
                    "name": task.assignee.name if task.assignee else "Unknown",
                    "role": task.assignee.role.value if task.assignee else "unknown",
                })

            if task.status not in (TaskStatus.COMPLETED, TaskStatus.CANCELLED):
                total_delay += task.estimated_days or 1

            approval_result = await db.execute(
                select(Approval).where(
                    Approval.related_task_id == tid,
                    Approval.status == ApprovalStatus.PENDING
                )
            )
            pending = approval_result.scalars().all()
            for a in pending:
                affected_approvals.append({
                    "id": a.id,
                    "title": a.title,
                    "approver": a.approver.name if a.approver else "Unknown",
                    "status": a.status.value,
                })

            if task.status == TaskStatus.BLOCKED or item["depth"] > 0:
                blocked_work.append({
                    "id": task.id,
                    "title": task.title,
                    "reason": f"Downstream dependency at depth {item['depth']}",
                })

    vendor_result = await db.execute(
        select(Vendor).where(Vendor.project_id == project_id)
    )
    vendors = vendor_result.scalars().all()
    for v in vendors:
        if v.stakeholder_id and v.stakeholder_id in seen_stakeholder_ids:
            affected_vendors.append({
                "id": v.id,
                "name": v.name,
                "specialty": v.specialty,
            })

    risk_level = "low"
    if len(affected_tasks) > 5 or total_delay > 14:
        risk_level = "critical"
    elif len(affected_tasks) > 3 or total_delay > 7:
        risk_level = "high"
    elif len(affected_tasks) > 1 or total_delay > 3:
        risk_level = "medium"

    recommendations = _generate_impact_recommendations(
        change_description, affected_tasks, affected_approvals, risk_level, total_delay
    )

    notes_parts = []
    if "kitchen" in change_description.lower():
        notes_parts.append("Cross-discipline handoff required: Lead Architect must transmit Rev-C2 CAD to Priya Nair (MEP) before floor conduit trenching. FurnishCraft millwork held pending dimensional sign-off.")
    elif "marble" in change_description.lower() or "floor" in change_description.lower():
        notes_parts.append("Coordination critical: Marble dry-lay inspection at warehouse must precede sub-floor screed completion. Leveling tolerances must meet ±2mm over 3m.")
    else:
        notes_parts.append(f"Coordination alert: Proposed change impacts {len(affected_stakeholders)} stakeholder(s) and {len(affected_tasks)} scheduled task(s). Direct trade alignment needed.")

    coordination_notes = " ".join(notes_parts)

    return ImpactAnalysisResponse(
        affected_stakeholders=affected_stakeholders,
        affected_tasks=affected_tasks,
        affected_vendors=affected_vendors,
        affected_approvals=affected_approvals,
        blocked_work=blocked_work,
        risk_level=risk_level,
        estimated_delay_days=total_delay,
        recommendations=recommendations,
        coordination_notes=coordination_notes,
    )


def _generate_impact_recommendations(
    change: str, tasks: list, approvals: list, risk: str, delay: int
) -> list[str]:
    recs = []

    if approvals:
        recs.append(f"Expedite {len(approvals)} pending approval(s) to prevent further delays")

    if risk in ("high", "critical"):
        recs.append("Schedule an urgent coordination meeting with all affected stakeholders")

    if delay > 7:
        recs.append(f"Consider parallel execution of independent tasks to reduce the {delay}-day estimated delay")

    if len(tasks) > 3:
        recs.append("Assign a dedicated coordinator to manage the cascading changes across teams")

    recs.append("Document the change rationale and communicate impact to all affected parties")

    if risk == "critical":
        recs.append("Escalate to project leadership for immediate attention and resource reallocation")

    return recs
