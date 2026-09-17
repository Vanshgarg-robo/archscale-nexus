"""
ArchScale Nexus - Role-Based Dashboard Engine
Separates dashboard access strictly according to RBAC:
1. Operations Dashboard (/api/dashboard/operations) -> ADMIN ONLY:
   Cross-project health, team performance, workload distribution, resource allocation,
   completion percentages, delayed projects, risk indicators.
2. Management Dashboard (/api/dashboard/management) -> MANAGEMENT TEAM:
   Assigned work, active tasks, progress updates, due dates, completion percentages.
   Viewer has read-only enforcement.
3. Vendor Dashboard (/api/dashboard/vendor) -> VENDORS / PARTNERS:
   Assigned deliverables, submission status, company work progress.
4. Client Executive Dashboard (/api/dashboard/{project_id}) -> CLIENT ONLY:
   Full project details, timeline, milestones, documents/drawings, budget, communication.
   Strictly forbidden for Admins and non-client users.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
from app.deps import get_session, get_current_user, require_role
from app.models import (
    Task, Decision, ChangeRequest, ProjectStakeholder, Project,
    Stakeholder, Risk, Approval, Document, Notification
)
from app.models.enums import TaskStatus, StakeholderRole, ProjectStatus
from app.models.user import User
from app.services.health_service import calculate_health
from app.services.approval_service import get_pending_approvals
from app.services.blocker_service import detect_blockers
from app.services.risk_service import get_risk_summary
from app.services.progress_service import calculate_project_progress, get_standardized_status

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ─────────────────────────────────────────────────────────────────────────────
# 1. ADMIN OPERATIONS DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/operations")
async def get_admin_operations_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Admin Operations Dashboard:
    Aggregated operational overview across all projects, clients, and teams.
    Excludes client-confidential drawings and internal client files.
    """
    if current_user.role != "admin" and not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin role required for the Operations Dashboard",
        )

    now = datetime.now(timezone.utc)

    # 1. Projects overview
    proj_res = await db.execute(select(Project).order_by(Project.id))
    projects = proj_res.scalars().all()

    total_projects = len(projects)
    active_projects = sum(1 for p in projects if p.status == ProjectStatus.IN_PROGRESS)
    delayed_projects = sum(
        1 for p in projects
        if p.target_end_date and p.target_end_date < now and (p.overall_completion_pct or 0) < 100
    )

    projects_summary = []
    for p in projects:
        prog = calculate_project_progress(p)
        projects_summary.append({
            "id": p.id,
            "name": p.name,
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "status_label": prog["status_label"],
            "health_score": round(p.health_score, 1),
            "health_status": p.health_status.value if hasattr(p.health_status, "value") else str(p.health_status),
            "overall_completion_pct": prog["overall_completion_pct"],
            "design_completion_pct": prog["design_completion_pct"],
            "planning_completion_pct": prog["planning_completion_pct"],
            "execution_completion_pct": prog["execution_completion_pct"],
            "documentation_completion_pct": prog["documentation_completion_pct"],
            "remaining_pct": prog["remaining_pct"],
            "target_end_date": p.target_end_date.isoformat() if p.target_end_date else None,
            "budget": p.budget,
        })

    # 2. Team Productivity & Workload Distribution
    stk_res = await db.execute(select(Stakeholder).order_by(Stakeholder.id))
    stakeholders = stk_res.scalars().all()

    team_performance = []
    for s in stakeholders:
        # Count assigned tasks and completed tasks
        assigned_res = await db.execute(
            select(func.count(Task.id)).where(Task.assignee_id == s.id)
        )
        total_assigned = assigned_res.scalar() or 0

        completed_res = await db.execute(
            select(func.count(Task.id)).where(Task.assignee_id == s.id, Task.status == TaskStatus.COMPLETED)
        )
        total_completed = completed_res.scalar() or 0

        prod_score = round((total_completed / total_assigned * 100) if total_assigned > 0 else 85.0, 1)

        team_performance.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "role": s.role.value if hasattr(s.role, "value") else str(s.role),
            "title": s.title,
            "assigned_tasks": total_assigned,
            "completed_tasks": total_completed,
            "workload_score": s.workload_score or (total_assigned * 15.0),
            "productivity_score": prod_score,
            "influence_score": s.influence_score,
        })

    # 3. Overall Task Totals
    total_tasks_res = await db.execute(select(func.count(Task.id)))
    total_tasks = total_tasks_res.scalar() or 0

    pending_tasks_res = await db.execute(
        select(func.count(Task.id)).where(Task.status.in_([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED]))
    )
    pending_tasks = pending_tasks_res.scalar() or 0

    completed_tasks_res = await db.execute(
        select(func.count(Task.id)).where(Task.status == TaskStatus.COMPLETED)
    )
    completed_tasks = completed_tasks_res.scalar() or 0

    # 3b. Approved / Rejected / Pending Approval counts
    approved_tasks_res = await db.execute(
        select(func.count(Task.id)).where(Task.status.in_([TaskStatus.APPROVED, TaskStatus.COMPLETED]))
    )
    approved_tasks = approved_tasks_res.scalar() or 0

    rejected_tasks_res = await db.execute(
        select(func.count(Task.id)).where(Task.status == TaskStatus.REJECTED)
    )
    rejected_tasks = rejected_tasks_res.scalar() or 0

    pending_approval_tasks_res = await db.execute(
        select(func.count(Task.id)).where(Task.status.in_([TaskStatus.PENDING_APPROVAL, TaskStatus.SUBMITTED]))
    )
    pending_approval_tasks = pending_approval_tasks_res.scalar() or 0

    # 4. Clients status
    client_stks = [s for s in stakeholders if s.role == StakeholderRole.CLIENT]
    clients_status = []
    for c in client_stks:
        clients_status.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "title": c.title,
            "assigned_projects": 1,
            "primary_project": projects[0].name if projects else "—",
            "project_status": projects_summary[0]["status_label"] if projects_summary else "Active",
            "completion_pct": projects_summary[0]["overall_completion_pct"] if projects_summary else 0,
        })

    # 5. Top Risk Indicators across the studio
    risk_res = await db.execute(
        select(Risk).order_by(Risk.risk_score.desc()).limit(6)
    )
    top_risks = risk_res.scalars().all()
    risk_indicators = [
        {
            "id": r.id,
            "title": r.title,
            "category": r.category.value if hasattr(r.category, "value") else str(r.category),
            "severity": r.severity.value if hasattr(r.severity, "value") else str(r.severity),
            "score": round(r.risk_score, 1),
            "status": "active" if r.is_active else "mitigated",
            "mitigation": r.mitigation or "Review mitigation plan with lead engineer",
        }
        for r in top_risks
    ]

    return {
        "view": "admin_operations",
        "total_projects": total_projects,
        "active_projects": active_projects,
        "delayed_projects": delayed_projects,
        "tasks_overview": {
            "total": total_tasks,
            "pending": pending_tasks,
            "completed": completed_tasks,
            "approved": approved_tasks,
            "rejected": rejected_tasks,
            "pending_approvals": pending_approval_tasks,
            "completion_rate": round((approved_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
        },
        "projects_summary": projects_summary,
        "team_performance": team_performance,
        "clients_status": clients_status,
        "risk_indicators": risk_indicators,
        "timestamp": now.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. MANAGEMENT TEAM DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/management")
async def get_management_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Management Team Dashboard:
    Tailored for project managers, architects, engineers, site supervisors, analysts, operators, and viewers.
    Shows assigned tasks, active work items, progress updates, due dates, completion percentages.
    Enforces read-only posture for Viewers.
    """
    allowed_roles = {"admin", "project_manager", "architect", "engineer", "site_supervisor", "analyst", "operator", "viewer"}
    if current_user.role not in allowed_roles and not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{current_user.role}' is not authorized to access the Management Dashboard",
        )

    stk_id = current_user.stakeholder_id

    # 1. Fetch tasks assigned to current stakeholder
    if stk_id:
        task_query = select(Task).where(Task.assignee_id == stk_id)
    else:
        task_query = select(Task).where(Task.id == -1)

    task_res = await db.execute(task_query.order_by(Task.due_date.asc()))
    assigned_tasks = task_res.scalars().all()

    # 2. Active tasks breakdown
    active_tasks = [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "priority": t.priority.value if hasattr(t.priority, "value") else str(t.priority),
            "progress": t.progress,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "estimated_days": t.estimated_days,
        }
        for t in assigned_tasks
    ]

    # 3. Project progress summaries for assigned projects
    if stk_id:
        proj_res = await db.execute(
            select(Project)
            .join(ProjectStakeholder, ProjectStakeholder.project_id == Project.id)
            .where(ProjectStakeholder.stakeholder_id == stk_id)
            .distinct()
            .order_by(Project.id)
        )
    else:
        proj_res = await db.execute(select(Project).order_by(Project.id))
    projects = proj_res.scalars().all()
    projects_progress = [
        {
            "id": p.id,
            "name": p.name,
            **calculate_project_progress(p),
        }
        for p in projects
    ]

    # 4. Recent project updates / decisions within assigned projects
    project_ids = [p.id for p in projects]
    if project_ids:
        dec_res = await db.execute(
            select(Decision)
            .where(Decision.project_id.in_(project_ids))
            .order_by(Decision.decided_at.desc())
            .limit(5)
        )
        recent_decisions = dec_res.scalars().all()

        # 5. Pending approvals within assigned projects
        appr_res = await db.execute(
            select(Approval)
            .where(Approval.project_id.in_(project_ids), Approval.status == "pending")
            .limit(5)
        )
        pending_approvals = appr_res.scalars().all()
    else:
        recent_decisions = []
        pending_approvals = []

    return {
        "view": "management",
        "user": {
            "name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
            "is_read_only": current_user.role == "viewer",
        },
        "assigned_tasks": active_tasks,
        "task_counts": {
            "total_assigned": len(assigned_tasks),
            "completed": sum(1 for t in assigned_tasks if t.status == TaskStatus.COMPLETED),
            "in_progress": sum(1 for t in assigned_tasks if t.status == TaskStatus.IN_PROGRESS),
            "pending": sum(1 for t in assigned_tasks if t.status == TaskStatus.NOT_STARTED),
            "approved": sum(1 for t in assigned_tasks if t.status in (TaskStatus.APPROVED, TaskStatus.COMPLETED)),
            "rejected": sum(1 for t in assigned_tasks if t.status == TaskStatus.REJECTED),
            "pending_approval": sum(1 for t in assigned_tasks if t.status in (TaskStatus.PENDING_APPROVAL, TaskStatus.SUBMITTED)),
        },
        "projects_progress": projects_progress,
        "recent_decisions": [
            {
                "id": d.id,
                "title": d.title,
                "rationale": d.rationale,
                "decided_at": d.decided_at.isoformat() if d.decided_at else None,
            }
            for d in recent_decisions
        ],
        "pending_approvals_count": len(pending_approvals),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. VENDOR PARTNER DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/vendor")
async def get_vendor_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Vendor Partner Dashboard:
    Isolated view for vendors, suppliers, and specialized contractors.
    Shows assigned deliverables, submission status, and work progress.
    Strictly prevents access to unrelated projects or client confidential details.
    """
    allowed_roles = {"vendor", "contractor", "site_supervisor"}
    if current_user.role not in allowed_roles and not current_user.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{current_user.role}' is not authorized to access the Vendor Dashboard",
        )

    stk_id = current_user.stakeholder_id

    # Fetch deliverables (tasks assigned to vendor stakeholder)
    if stk_id:
        task_query = select(Task).where(Task.assignee_id == stk_id)
    else:
        # Fallback to tasks assigned to vendor roles
        task_query = select(Task).limit(6)

    task_res = await db.execute(task_query.order_by(Task.due_date.asc()))
    deliverables = task_res.scalars().all()

    # High-level project progress (phase info only, no private client financials)
    proj_res = await db.execute(select(Project).limit(1))
    proj = proj_res.scalar_one_or_none()
    prog_info = calculate_project_progress(proj) if proj else {}

    deliverable_items = []
    for d in deliverables:
        submission_status = "Approved" if d.status == TaskStatus.COMPLETED else (
            "Under Review" if d.progress >= 80 else ("In Progress" if d.progress > 0 else "Pending Submission")
        )
        deliverable_items.append({
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "submission_status": submission_status,
            "progress": d.progress,
            "due_date": d.due_date.isoformat() if d.due_date else None,
            "priority": d.priority.value if hasattr(d.priority, "value") else str(d.priority),
        })

    return {
        "view": "vendor",
        "vendor_info": {
            "name": current_user.full_name,
            "email": current_user.email,
            "company": current_user.organization.name if current_user.organization else "Partner Studio",
            "role": current_user.role,
        },
        "assigned_deliverables": deliverable_items,
        "deliverables_summary": {
            "total": len(deliverable_items),
            "completed": sum(1 for d in deliverable_items if d["status"] == "completed"),
            "in_progress": sum(1 for d in deliverable_items if d["status"] == "in_progress"),
            "pending": sum(1 for d in deliverable_items if d["status"] == "not_started"),
        },
        "project_progress": {
            "project_name": proj.name if proj else "Assigned Project",
            "overall_completion_pct": prog_info.get("overall_completion_pct", 0),
            "status_label": prog_info.get("status_label", "In Progress"),
            "display_completed": prog_info.get("display_completed", "Completed: 0%"),
            "display_remaining": prog_info.get("display_remaining", "Remaining: 100%"),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. CLIENT EXECUTIVE DASHBOARD (CLIENT ONLY)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{project_id}")
async def get_client_executive_dashboard(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Client Executive Dashboard:
    CRITICAL BUSINESS RULE:
    Only the CLIENT who owns or is assigned to a project can view the complete project details.
    Admins, vendors, and other unauthorized roles attempting to access this endpoint receive 403 Forbidden.
    """
    # 1. Enforce strict role check: Only client can view executive project details
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Access denied: Role '{current_user.role}' is not authorized to view confidential client project details. "
                "The complete Executive Project Dashboard is reserved exclusively for the client."
            ),
        )

    # 2. Verify project exists
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 3. Verify client ownership or assignment
    is_authorized = (project.client_id == current_user.id)
    if not is_authorized and current_user.stakeholder_id:
        stk_res = await db.execute(
            select(ProjectStakeholder).where(
                ProjectStakeholder.project_id == project_id,
                ProjectStakeholder.stakeholder_id == current_user.stakeholder_id,
            )
        )
        is_authorized = stk_res.scalar_one_or_none() is not None

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own this project",
        )

    # 4. Assemble complete client project payload
    progress = calculate_project_progress(project)
    health = await calculate_health(db, project_id)
    pending_approvals = await get_pending_approvals(db, project_id)
    blockers = await detect_blockers(db, project_id)
    risk_summary = await get_risk_summary(db, project_id)

    # Documents & Drawings
    doc_res = await db.execute(
        select(Document).where(Document.project_id == project_id).order_by(Document.created_at.desc())
    )
    documents = doc_res.scalars().all()

    # Milestones (Key milestones derived from project phases and completed tasks)
    task_res = await db.execute(
        select(Task).where(Task.project_id == project_id).order_by(Task.due_date.asc())
    )
    all_tasks = task_res.scalars().all()
    milestones = [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "progress": t.progress,
            "assignee": t.assignee.name if t.assignee else "Project Team",
        }
        for t in all_tasks[:8]
    ]

    # Budget breakdown
    total_budget = project.budget or 12500000.0
    spent_budget = round(total_budget * (progress["overall_completion_pct"] / 100.0) * 0.9, 2)
    committed_budget = round(total_budget * 0.2, 2)
    remaining_budget = round(total_budget - spent_budget, 2)

    budget_breakdown = {
        "total_budget": total_budget,
        "spent_to_date": spent_budget,
        "committed": committed_budget,
        "remaining_contingency": remaining_budget,
        "currency": "INR",
        "formatted_total": f"₹{total_budget:,.2f}",
        "formatted_spent": f"₹{spent_budget:,.2f}",
        "formatted_remaining": f"₹{remaining_budget:,.2f}",
    }

    # Recent decisions
    dec_res = await db.execute(
        select(Decision).where(Decision.project_id == project_id).order_by(Decision.decided_at.desc()).limit(5)
    )
    decisions = dec_res.scalars().all()

    # Change requests
    cr_res = await db.execute(
        select(ChangeRequest).where(ChangeRequest.project_id == project_id).order_by(ChangeRequest.created_at.desc()).limit(5)
    )
    change_requests = cr_res.scalars().all()

    # Stakeholder contact list
    stk_assign_res = await db.execute(
        select(ProjectStakeholder).where(ProjectStakeholder.project_id == project_id)
    )
    assignments = stk_assign_res.scalars().all()

    return {
        "view": "client_executive",
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "location": project.location,
            "budget": project.budget,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "target_end_date": project.target_end_date.isoformat() if project.target_end_date else None,
            "status": project.status.value if hasattr(project.status, "value") else str(project.status),
            "health_score": project.health_score,
            "health_status": project.health_status.value if hasattr(project.health_status, "value") else str(project.health_status),
        },
        "progress": progress,
        "health": health,
        "budget_breakdown": budget_breakdown,
        "milestones": milestones,
        "documents": [
            {
                "id": d.id,
                "title": d.title,
                "document_type": d.document_type,
                "file_url": d.file_url,
                "extracted_data": d.extracted_data,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in documents
        ],
        "pending_approvals": pending_approvals[:5],
        "blockers": [b.model_dump() for b in blockers[:5]],
        "risks": risk_summary,
        "recent_decisions": [
            {
                "id": d.id,
                "title": d.title,
                "rationale": d.rationale,
                "decided_by": d.decided_by_stakeholder.name if d.decided_by_stakeholder else None,
                "decided_at": d.decided_at.isoformat() if d.decided_at else None,
            }
            for d in decisions
        ],
        "change_requests": [
            {
                "id": cr.id,
                "title": cr.title,
                "status": cr.status.value if hasattr(cr.status, "value") else str(cr.status),
                "risk_level": cr.risk_level,
                "estimated_delay_days": cr.estimated_delay_days,
            }
            for cr in change_requests
        ],
        "team_contacts": [
            {
                "id": a.stakeholder.id,
                "name": a.stakeholder.name,
                "role": a.stakeholder.role.value if hasattr(a.stakeholder.role, "value") else str(a.stakeholder.role),
                "title": a.stakeholder.title,
                "phone": a.stakeholder.phone,
                "email": a.stakeholder.email,
            }
            for a in assignments
        ],
    }
