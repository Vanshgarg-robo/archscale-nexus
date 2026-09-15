"""
ArchScale Nexus - Standardized Project Progress Engine
Calculates and normalizes multi-phase completion percentages:
- Overall completion %
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
from app.models.project import Project
from app.models.enums import ProjectStatus


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
            {"phase": "Planning", "completion_pct": planning, "status": "Completed" if planning >= 100 else ("In Progress" if planning > 0 else "Not Started")},
            {"phase": "Design", "completion_pct": design, "status": "Completed" if design >= 100 else ("In Progress" if design > 0 else "Not Started")},
            {"phase": "Execution", "completion_pct": execution, "status": "Completed" if execution >= 100 else ("In Progress" if execution > 0 else "Not Started")},
            {"phase": "Documentation", "completion_pct": documentation, "status": "Completed" if documentation >= 100 else ("In Progress" if documentation > 0 else "Not Started")},
        ]
    }
