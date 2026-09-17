"""
ArchScale Nexus - Standardized Project Progress Engine
Calculates and normalizes multi-phase completion percentages:
- Overall completion % (driven dynamically by approved tasks)
- Design completion %
- Planning completion %
- Execution completion %
- Documentation completion %
Provides standardized formatted metrics:
Completed: XX%
Remaining: XX%
Status: Not Started | In Progress | Under Review | Completed | Delayed
"""

from typing import Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.project import Project
from app.models.task import Task
from app.models.enums import ProjectStatus, TaskStatus


def get_standardized_status(project: Project) -> str:
    """Map project status and dates to standardized status labels:
    Not Started | In Progress | Under Review | Completed | Delayed
    """
    now = datetime.now(timezone.utc)
    if project.status == ProjectStatus.COMPLETED or (project.overall_completion_pct or 0) >= 100.0:
        return "Completed"
    if project.status == ProjectStatus.ON_HOLD:
        return "Under Review"
    if project.target_end_date and project.target_end_date < now and (project.overall_completion_pct or 0) < 100.0:
        return "Delayed"
    if project.status == ProjectStatus.PLANNING and (project.overall_completion_pct or 0) == 0:
        return "Not Started"
    return "In Progress"


def calculate_project_progress(project: Project) -> dict[str, Any]:
    """Calculate standardized progress dictionary for a given project."""
    overall = round(float(project.overall_completion_pct or 0.0), 1)
    design = round(float(project.design_completion_pct or 0.0), 1)
    planning = round(float(project.planning_completion_pct or 0.0), 1)
    execution = round(float(project.execution_completion_pct or 0.0), 1)
    documentation = round(float(project.documentation_completion_pct or 0.0), 1)

    # Bound percentages between 0 and 100
    overall = max(0.0, min(100.0, overall))
    design = max(0.0, min(100.0, design))
    planning = max(0.0, min(100.0, planning))
    execution = max(0.0, min(100.0, execution))
    documentation = max(0.0, min(100.0, documentation))

    remaining = round(max(0.0, 100.0 - overall), 1)
    status_label = get_standardized_status(project)

    return {
        "overall_completion_pct": overall,
        "design_completion_pct": design,
        "planning_completion_pct": planning,
        "execution_completion_pct": execution,
        "documentation_completion_pct": documentation,
        "completed_pct": overall,
        "remaining_pct": remaining,
        "status_label": status_label,
        "display_completed": f"Completed: {overall}%",
        "display_remaining": f"Remaining: {remaining}%",
        "phases": [
            {
                "phase": "Planning",
                "completion_pct": planning,
                "status": "Completed" if planning >= 100 else ("In Progress" if planning > 0 else "Not Started"),
            },
            {
                "phase": "Design",
                "completion_pct": design,
                "status": "Completed" if design >= 100 else ("In Progress" if design > 0 else "Not Started"),
            },
            {
                "phase": "Execution",
                "completion_pct": execution,
                "status": "Completed" if execution >= 100 else ("In Progress" if execution > 0 else "Not Started"),
            },
            {
                "phase": "Documentation",
                "completion_pct": documentation,
                "status": "Completed" if documentation >= 100 else ("In Progress" if documentation > 0 else "Not Started"),
            },
        ],
    }


def _classify_task_phase(title: str, description: str | None = None) -> str:
    """Classifies a task into one of the 4 key architecture/construction phases."""
    text = f"{title} {description or ''}".lower()
    if any(k in text for k in ["survey", "site", "master plan", "spatial", "zoning", "sanction", "planning", "permit"]):
        return "planning"
    if any(k in text for k in ["design", "concept", "schematic", "drawing", "palette", "aesthetic", "cad", "mockup", "3d", "interior"]):
        return "design"
    if any(k in text for k in ["report", "compliance", "inspection", "audit", "certification", "clearance", "warranty", "as-built", "handover", "documentation", "manual"]):
        return "documentation"
    return "execution"


async def recalculate_and_save_project_progress(db: AsyncSession, project_id: int) -> dict[str, Any]:
    """Dynamically recalculates project progress based on APPROVED and COMPLETED tasks.
    Enforces the rule:
    - Approved work counts towards project completion.
    - Rejected, Draft, Pending work does NOT count.
    - Weighs tasks by task.weight (or equal weights).
    - Automatically updates project.overall_completion_pct and phase percentages in DB.
    """
    proj_res = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        return {}

    task_res = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = task_res.scalars().all()

    if not tasks:
        project.overall_completion_pct = 0.0
        project.design_completion_pct = 0.0
        project.planning_completion_pct = 0.0
        project.execution_completion_pct = 0.0
        project.documentation_completion_pct = 0.0
        await db.flush()
        return calculate_project_progress(project)

    # Calculate weighted progress
    total_weight = sum(t.weight if (t.weight and t.weight > 0) else 1.0 for t in tasks)

    approved_statuses = {TaskStatus.APPROVED, TaskStatus.COMPLETED}
    approved_weight = sum(
        t.weight if (t.weight and t.weight > 0) else 1.0
        for t in tasks
        if t.status in approved_statuses
    )

    overall_pct = round((approved_weight / total_weight) * 100.0, 1) if total_weight > 0 else 0.0
    overall_pct = max(0.0, min(100.0, overall_pct))

    # Phase calculations
    phase_weights: dict[str, float] = {"planning": 0.0, "design": 0.0, "execution": 0.0, "documentation": 0.0}
    phase_approved: dict[str, float] = {"planning": 0.0, "design": 0.0, "execution": 0.0, "documentation": 0.0}

    for t in tasks:
        ph = _classify_task_phase(t.title, t.description)
        w = t.weight if (t.weight and t.weight > 0) else 1.0
        phase_weights[ph] += w
        if t.status in approved_statuses:
            phase_approved[ph] += w

    def _calc_ph(ph: str) -> float:
        if phase_weights[ph] <= 0:
            return overall_pct
        return round((phase_approved[ph] / phase_weights[ph]) * 100.0, 1)

    planning_pct = max(0.0, min(100.0, _calc_ph("planning")))
    design_pct = max(0.0, min(100.0, _calc_ph("design")))
    execution_pct = max(0.0, min(100.0, _calc_ph("execution")))
    documentation_pct = max(0.0, min(100.0, _calc_ph("documentation")))

    # Update database
    project.overall_completion_pct = overall_pct
    project.planning_completion_pct = planning_pct
    project.design_completion_pct = design_pct
    project.execution_completion_pct = execution_pct
    project.documentation_completion_pct = documentation_pct

    if overall_pct >= 100.0:
        project.status = ProjectStatus.COMPLETED
    elif project.status == ProjectStatus.COMPLETED and overall_pct < 100.0:
        project.status = ProjectStatus.IN_PROGRESS

    await db.flush()
    return calculate_project_progress(project)
