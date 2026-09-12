from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.deps import get_session
from app.models import Notification
from app.schemas.notification import NotificationRead

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/project/{project_id}")
async def list_notifications(project_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(
        select(Notification).where(Notification.project_id == project_id).order_by(Notification.created_at.desc())
    )
    notifications = result.scalars().all()
    return [
        {
            "id": n.id,
            "notification_type": n.notification_type.value,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    if notification:
        notification.is_read = True
        await db.flush()
    return {"status": "ok"}
