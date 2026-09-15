from pydantic import BaseModel
from datetime import datetime
from app.models.enums import ProjectStatus, HealthStatus


class ProjectCreate(BaseModel):
    organization_id: int
    name: str
    description: str | None = None
    location: str | None = None
    budget: float | None = None
    start_date: datetime | None = None
    target_end_date: datetime | None = None


class ProjectRead(BaseModel):
    id: int
    organization_id: int
    name: str
    description: str | None
    status: ProjectStatus
    health_score: float
    health_status: HealthStatus
    start_date: datetime | None
    target_end_date: datetime | None
    location: str | None
    budget: float | None
    client_id: int | None = None
    overall_completion_pct: float = 0.0
    design_completion_pct: float = 0.0
    planning_completion_pct: float = 0.0
    execution_completion_pct: float = 0.0
    documentation_completion_pct: float = 0.0
    created_at: datetime | None

    model_config = {"from_attributes": True}


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    location: str | None = None
    budget: float | None = None
    overall_completion_pct: float | None = None
    design_completion_pct: float | None = None
    planning_completion_pct: float | None = None
    execution_completion_pct: float | None = None
    documentation_completion_pct: float | None = None
