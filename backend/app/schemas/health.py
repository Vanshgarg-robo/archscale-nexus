from pydantic import BaseModel
from datetime import datetime
from app.models.enums import HealthStatus


class HealthRead(BaseModel):
    project_id: int
    score: float
    status: HealthStatus
    overdue_tasks: int
    pending_approvals: int
    blocker_count: int
    risk_count: int
    dependency_failures: int
    summary: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class HealthHistory(BaseModel):
    snapshots: list[HealthRead] = []
