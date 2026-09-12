from pydantic import BaseModel
from datetime import datetime
from app.models.enums import ApprovalStatus


class ApprovalCreate(BaseModel):
    project_id: int
    related_task_id: int | None = None
    change_request_id: int | None = None
    requester_id: int
    approver_id: int
    title: str
    description: str | None = None
    approval_type: str = "general"
    due_date: datetime | None = None


class ApprovalRead(BaseModel):
    id: int
    project_id: int
    related_task_id: int | None
    change_request_id: int | None
    requester_id: int
    approver_id: int
    title: str
    description: str | None
    status: ApprovalStatus
    approval_type: str
    due_date: datetime | None
    decided_at: datetime | None
    notes: str | None
    created_at: datetime | None
    requester_name: str | None = None
    approver_name: str | None = None

    model_config = {"from_attributes": True}


class ApprovalUpdate(BaseModel):
    status: ApprovalStatus | None = None
    notes: str | None = None
