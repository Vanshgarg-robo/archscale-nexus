from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import require_role
from app.models.user import User
from app.schemas.admin import AdminNotificationResponse, AdminNotificationListResponse
from app.services import admin_notification_service

router = APIRouter(prefix="/api/admin/notifications", tags=["Admin - Notifications"])


@router.get("", response_model=AdminNotificationListResponse)
async def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await admin_notification_service.list_notifications(
        db=db, limit=limit, offset=offset, unread_only=unread_only,
    )
    return AdminNotificationListResponse(
        notifications=[
            AdminNotificationResponse(
                id=n.id,
                user_id=n.user_id,
                notification_type=n.notification_type,
                title=n.title,
                message=n.message,
                is_read=n.is_read,
                created_at=n.created_at,
            )
            for n in result["notifications"]
        ],
        total=result["total"],
        unread_count=result["unread_count"],
    )


@router.get("/unread-count")
async def get_unread_count(
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    count = await admin_notification_service.get_unread_count(db)
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    notification = await admin_notification_service.mark_read(db, notification_id)
    if not notification:
        return {"status": "not_found"}
    await db.commit()
    return {"status": "ok"}


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    count = await admin_notification_service.mark_all_read(db)
    await db.commit()
    return {"status": "ok", "marked": count}
