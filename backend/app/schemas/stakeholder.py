from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.enums import StakeholderRole


class StakeholderCreate(BaseModel):
    organization_id: int
    name: str
    email: str
    phone: str | None = None
    role: StakeholderRole
    title: str | None = None


class StakeholderRead(BaseModel):
    id: int
    organization_id: int
    name: str
    email: str
    phone: str | None
    role: StakeholderRole
    title: str | None
    avatar_url: str | None
    influence_score: float
    workload_score: float
    created_at: datetime | None

    model_config = {"from_attributes": True}


class StakeholderUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    role: StakeholderRole | None = None
    title: str | None = None


class StakeholderMatrix(BaseModel):
    stakeholder: StakeholderRead
    assigned_tasks_count: int = 0
    pending_approvals_count: int = 0
    active_risks_count: int = 0
    responsibility_areas: str | None = None


class StakeholderWorkload(BaseModel):
    stakeholder_id: int
    name: str
    role: StakeholderRole
    total_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    pending_approvals: int = 0
    workload_score: float = 0.0
