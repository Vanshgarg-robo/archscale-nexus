from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from app.deps import get_session, get_current_user, require_not_viewer
from app.models import (
    Project, ChangeRequest, Task, Dependency, Approval,
    Stakeholder, Notification, HealthSnapshot, User
)
from app.models.enums import (
    ChangeRequestStatus, TaskStatus, ApprovalStatus, NotificationType, HealthStatus
)

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/kitchen-redesign")
async def trigger_kitchen_redesign_demo(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    proj_result = await db.execute(select(Project).limit(1))
    project = proj_result.scalar_one_or_none()
    if not project:
        return {"error": "Project not found"}

    now = datetime.now(timezone.utc)

    stk_result = await db.execute(select(Stakeholder).where(Stakeholder.organization_id == project.organization_id).limit(15))
    stakeholders = stk_result.scalars().all()
    stk_dict = {s.role.value: s for s in stakeholders}
    client_stk = stk_dict.get("client", stakeholders[0] if stakeholders else None)

    existing_cr = await db.execute(
        select(ChangeRequest).where(
            ChangeRequest.project_id == project.id,
            ChangeRequest.title.like("%Kitchen%"),
        )
    )
    cr = existing_cr.scalar_one_or_none()
    if not cr:
        cr = ChangeRequest(
            project_id=project.id,
            owner_id=client_stk.id if client_stk else 1,
            title="Client Request: Kitchen Island Redesign & Conduit Relocation",
            description="Client requested shifting kitchen central island by 1.2m towards dining partition with waterfall quartz edge and integrated induction cooktop hob.",
            reason="Client ergonomic upgrade and enhanced entertaining layout",
            status=ChangeRequestStatus.UNDER_REVIEW,
            affected_areas={"zones": ["Kitchen", "Dining Partition"], "disciplines": ["Architectural", "Electrical", "Millwork"]},
            impact_summary="Requires electrical rerouting from sub-panel, conduit floor trenching, and cabinetry revision.",
            estimated_delay_days=4,
            risk_level="high",
        )
        db.add(cr)
        await db.flush()

    affected_stakeholders = [
        {"name": stk_dict.get("architect", stakeholders[1]).name, "role": "Architect", "impact": "Must produce revised layout drawing rev-C2 within 48h"},
        {"name": stk_dict.get("electrical_engineer", stakeholders[4]).name, "role": "Electrical Engineer", "impact": "Recalculate conduit routes and floor channel penetration"},
        {"name": stk_dict.get("vendor", stakeholders[6]).name, "role": "Furniture Vendor", "impact": "Hold cabinetry cutting until revised CAD received"},
        {"name": stk_dict.get("contractor", stakeholders[5]).name, "role": "Contractor", "impact": "Pause kitchen sub-floor screed work"},
    ]

    task_result = await db.execute(select(Task).where(Task.project_id == project.id))
    tasks = task_result.scalars().all()
    elec_task = next((t for t in tasks if "electrical" in t.title.lower() or "kitchen" in t.title.lower()), tasks[0] if tasks else None)
    if elec_task:
        elec_task.status = TaskStatus.BLOCKED
        elec_task.progress = min(elec_task.progress, 40)

    existing_appr = await db.execute(
        select(Approval).where(
            Approval.project_id == project.id,
            Approval.title.like("%Kitchen Island%"),
        )
    )
    appr = existing_appr.scalar_one_or_none()
    if not appr:
        architect = stk_dict.get("architect", stakeholders[1])
        client_stk = stk_dict.get("client", stakeholders[0])
        appr = Approval(
            project_id=project.id,
            requester_id=client_stk.id,
            approver_id=architect.id,
            title="Architectural Approval: Kitchen Island Relocation Rev-C2",
            approval_type="architect_approval",
            status=ApprovalStatus.PENDING,
            due_date=now + timedelta(days=2),
            change_request_id=cr.id,
            related_task_id=elec_task.id if elec_task else None,
            notes="Pending revised CAD signoff from Ananya Sharma before floor trenching begins.",
        )
        db.add(appr)
        await db.flush()

    project.health_score = 52.0
    project.health_status = HealthStatus.AT_RISK

    notif = Notification(
        project_id=project.id,
        recipient_id=stakeholders[0].id if stakeholders else 1,
        notification_type=NotificationType.CHANGE_IMPACT,
        title="Kitchen Redesign Impact Chain Activated",
        message="Client kitchen island relocation triggered 4 downstream task blocks, 1 pending approval, and an estimated 4-day critical path delay.",
        is_read=False,
    )
    db.add(notif)
    await db.flush()

    recommendations = [
        "Priority 1: Expedite Lead Architect approval on drawing Rev-C2 by tomorrow 17:00.",
        "Priority 2: Issue temporary hold notice to FurnishCraft vendor for kitchen carcasses.",
        "Priority 3: Re-sequence ceiling drywall work to keep electrical crew productive elsewhere.",
        "Priority 4: Notify client Rajiv Mehra regarding the +4 day schedule impact and budget delta.",
    ]

    steps = [
        {
            "step": 1,
            "title": "Created Change Request",
            "status": "completed",
            "data": {"id": cr.id, "title": cr.title, "status": cr.status.value, "risk": cr.risk_level},
        },
        {
            "step": 2,
            "title": "Extracted Affected Stakeholders",
            "status": "completed",
            "data": affected_stakeholders,
        },
        {
            "step": 3,
            "title": "Mapped Impacted Dependencies",
            "status": "completed",
            "data": [
                {"from": "Kitchen Architectural Layout", "to": "Floor Conduit Rough-in", "status": "blocked"},
                {"from": "Floor Conduit Rough-in", "to": "Sub-floor Screeding", "status": "delayed"},
                {"from": "Sub-floor Screeding", "to": "Cabinetry Millwork", "status": "delayed"},
            ],
        },
        {
            "step": 4,
            "title": "Detected Blocked Tasks",
            "status": "completed",
            "data": [
                {"task": elec_task.title if elec_task else "Kitchen Electrical Rough-in", "status": "BLOCKED", "owner": "Priya Nair"}
            ],
        },
        {
            "step": 5,
            "title": "Requested Multi-Stakeholder Approvals",
            "status": "completed",
            "data": {"approval_id": appr.id, "title": appr.title, "due": appr.due_date.isoformat() if appr.due_date else None},
        },
        {
            "step": 6,
            "title": "Calculated Schedule Delay",
            "status": "completed",
            "data": {"delay_days": 4, "critical_path_impact": "High", "confidence": "94%"},
        },
        {
            "step": 7,
            "title": "Updated Project Health",
            "status": "completed",
            "data": {"previous_score": 62.0, "new_score": 52.0, "status": "AT_RISK"},
        },
        {
            "step": 8,
            "title": "Generated AI Coordination Recommendations",
            "status": "completed",
            "data": recommendations,
        },
    ]

    return {
        "success": True,
        "message": "Demo Scenario executed: Kitchen Redesign coordination chain successfully processed.",
        "steps": steps,
        "health_score": project.health_score,
        "health_status": project.health_status.value,
        "recommendations": recommendations,
    }


@router.post("/reset")
async def reset_demo(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    require_not_viewer(current_user)
    proj_result = await db.execute(select(Project).limit(1))
    project = proj_result.scalar_one_or_none()
    if not project:
        return {"error": "Project not found"}

    project.health_score = 62.0
    project.health_status = HealthStatus.AT_RISK

    task_result = await db.execute(select(Task).where(Task.project_id == project.id))
    tasks = task_result.scalars().all()
    for t in tasks:
        if "kitchen" in t.title.lower() or "electrical" in t.title.lower():
            if t.status == TaskStatus.BLOCKED:
                t.status = TaskStatus.IN_PROGRESS
                t.progress = 55

    await db.commit()
    return {"success": True, "message": "Demo scenario reset to baseline."}
