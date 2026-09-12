from pydantic import BaseModel
from datetime import datetime
from app.models.enums import NotificationType


class NotificationRead(BaseModel):
    id: int
    project_id: int
    recipient_id: int
    notification_type: NotificationType
    title: str
    message: str | None
    is_read: bool
    related_entity_type: str | None
    related_entity_id: int | None
    created_at: datetime | None

    model_config = {"from_attributes": True}
