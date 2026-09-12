from pydantic import BaseModel
from datetime import datetime
from app.models.enums import RiskCategory, RiskSeverity


class RiskCreate(BaseModel):
    project_id: int
    title: str
    description: str | None = None
    category: RiskCategory
    severity: RiskSeverity = RiskSeverity.MEDIUM
    probability: float = 0.5
    impact_score: float = 5.0
    mitigation: str | None = None
    affected_task_ids: dict | None = None
    owner_id: int | None = None


class RiskRead(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    category: RiskCategory
    severity: RiskSeverity
    probability: float
    impact_score: float
    risk_score: float
    mitigation: str | None
    affected_task_ids: dict | None
    owner_id: int | None
    is_active: bool
    created_at: datetime | None
    owner_name: str | None = None

    model_config = {"from_attributes": True}


class RiskUpdate(BaseModel):
    severity: RiskSeverity | None = None
    probability: float | None = None
    impact_score: float | None = None
    mitigation: str | None = None
    is_active: bool | None = None
