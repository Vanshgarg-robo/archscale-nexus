from pydantic import BaseModel
from datetime import datetime
from app.models.enums import TaskStatus, TaskPriority


class TaskCreate(BaseModel):
    project_id: int
    assignee_id: int | None = None
    title: str
    description: str | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
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
    due_date: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    estimated_days: int | None
    created_at: datetime | None
    assignee_name: str | None = None

    model_config = {"from_attributes": True}


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    progress: int | None = None
    assignee_id: int | None = None
    due_date: datetime | None = None
