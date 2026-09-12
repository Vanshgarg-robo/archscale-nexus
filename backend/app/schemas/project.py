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
    created_at: datetime | None

    model_config = {"from_attributes": True}


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    location: str | None = None
    budget: float | None = None
