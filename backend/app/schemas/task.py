from pydantic import BaseModel
from datetime import datetime
from app.models.enums import TaskStatus, TaskPriority


class TaskCreate(BaseModel):
    project_id: int
    assignee_id: int | None = None
    title: str
    description: str | None = None
    status: TaskStatus = TaskStatus.DRAFT
    priority: TaskPriority = TaskPriority.MEDIUM
    weight: float = 1.0
    due_date: datetime | None = None
    estimated_days: int | None = None


class TaskRead(BaseModel):
    id: int
    project_id: int
    assignee_id: int | None
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    progress: int
    weight: float = 1.0
    due_date: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    estimated_days: int | None
    created_at: datetime | None
    assignee_name: str | None = None
    approved_at: datetime | None = None
    approved_by_id: int | None = None
    approved_by_name: str | None = None
    rejected_at: datetime | None = None
    rejected_by_id: int | None = None
    rejected_by_name: str | None = None
    rejection_reason: str | None = None
    rejection_comments: str | None = None

    model_config = {"from_attributes": True}


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    progress: int | None = None
    weight: float | None = None
    assignee_id: int | None = None
    due_date: datetime | None = None


class TaskDecisionRequest(BaseModel):
    reason: str | None = None  # e.g. "Missing information", "Needs revision", "Budget issue", "Timeline issue"
    comments: str | None = None
    notes: str | None = None
