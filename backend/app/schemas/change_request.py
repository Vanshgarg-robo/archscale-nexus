from pydantic import BaseModel
from datetime import datetime
from app.models.enums import ChangeRequestStatus


class ChangeRequestCreate(BaseModel):
    project_id: int
    owner_id: int
    title: str
    description: str | None = None
    reason: str | None = None
    affected_areas: dict | None = None


class ChangeRequestRead(BaseModel):
    id: int
    project_id: int
    owner_id: int
    title: str
    description: str | None
    reason: str | None
    affected_areas: dict | None
    status: ChangeRequestStatus
    impact_summary: str | None
    estimated_delay_days: int | None
    risk_level: str | None
    created_at: datetime | None
    owner_name: str | None = None

    model_config = {"from_attributes": True}


class ChangeRequestUpdate(BaseModel):
    status: ChangeRequestStatus | None = None
    impact_summary: str | None = None
    estimated_delay_days: int | None = None
    risk_level: str | None = None
