from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import ChangeRequest, Approval, Task
from app.models.enums import ChangeRequestStatus, ApprovalStatus
from app.services.impact_service import analyze_impact


async def submit_change_request(db: AsyncSession, project_id: int, owner_id: int, title: str, description: str, reason: str, affected_areas: dict | None) -> dict:
    cr = ChangeRequest(
        project_id=project_id,
        owner_id=owner_id,
        title=title,
        description=description,
        reason=reason,
        affected_areas=affected_areas,
        status=ChangeRequestStatus.PROPOSED,
    )
    db.add(cr)
    await db.flush()

    task_ids = []
    if affected_areas and "task_ids" in affected_areas:
        task_ids = affected_areas["task_ids"]

    impact = None
    if task_ids:
        impact = await analyze_impact(db, project_id, title, task_ids)
        cr.impact_summary = f"Affects {len(impact.affected_tasks)} tasks, {len(impact.affected_stakeholders)} stakeholders. Risk: {impact.risk_level}"
        cr.estimated_delay_days = impact.estimated_delay_days
        cr.risk_level = impact.risk_level
        await db.flush()

    return {
        "id": cr.id,
        "title": cr.title,
        "status": cr.status.value,
        "impact": impact.model_dump() if impact else None,
    }


async def transition_status(db: AsyncSession, cr_id: int, new_status: ChangeRequestStatus) -> dict:
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == cr_id))
    cr = result.scalar_one_or_none()

    if not cr:
        return {"error": "Change request not found"}

    valid_transitions = {
        ChangeRequestStatus.PROPOSED: [ChangeRequestStatus.UNDER_REVIEW, ChangeRequestStatus.REJECTED],
        ChangeRequestStatus.UNDER_REVIEW: [ChangeRequestStatus.APPROVED, ChangeRequestStatus.REJECTED],
        ChangeRequestStatus.APPROVED: [ChangeRequestStatus.IMPLEMENTED],
        ChangeRequestStatus.REJECTED: [ChangeRequestStatus.PROPOSED],
    }

    allowed = valid_transitions.get(cr.status, [])
    if new_status not in allowed:
        return {"error": f"Cannot transition from {cr.status.value} to {new_status.value}"}

    cr.status = new_status
    await db.flush()

    return {
        "id": cr.id,
        "title": cr.title,
        "status": cr.status.value,
        "previous_status": cr.status.value,
    }
