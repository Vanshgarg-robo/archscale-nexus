from pydantic import BaseModel
from datetime import datetime
from app.models.enums import RelationshipType


class DependencyCreate(BaseModel):
    source_id: int
    target_id: int
    relationship_type: RelationshipType = RelationshipType.DEPENDS_ON
    description: str | None = None


class DependencyRead(BaseModel):
    id: int
    source_id: int
    target_id: int
    relationship_type: RelationshipType
    description: str | None
    source_task_title: str | None = None
    target_task_title: str | None = None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class DependencyChain(BaseModel):
    task_id: int
    task_title: str
    depth: int
    status: str
    assignee_name: str | None = None
    children: list["DependencyChain"] = []
