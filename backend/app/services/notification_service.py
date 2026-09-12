from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Notification
from app.models.enums import NotificationType


async def create_notification(
    db: AsyncSession,
    project_id: int,
    recipient_id: int,
    notification_type: NotificationType,
    title: str,
    message: str,
    related_entity_type: str | None = None,
    related_entity_id: int | None = None,
) -> Notification:
    notification = Notification(
        project_id=project_id,
        recipient_id=recipient_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
    )
    db.add(notification)
    await db.flush()
    return notification


async def notify_stakeholders_of_change(
    db: AsyncSession,
    project_id: int,
    stakeholder_ids: list[int],
    change_title: str,
    impact_summary: str,
) -> list[Notification]:
    notifications = []
    for sid in stakeholder_ids:
        n = await create_notification(
            db=db,
            project_id=project_id,
            recipient_id=sid,
            notification_type=NotificationType.CHANGE_IMPACT,
            title=f"Change Impact: {change_title}",
            message=impact_summary,
            related_entity_type="change_request",
        )
        notifications.append(n)
    return notifications
