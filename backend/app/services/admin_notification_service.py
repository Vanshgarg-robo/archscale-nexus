from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.admin_notification import AdminNotification


async def create_notification(
    db: AsyncSession,
    notification_type: str,
    title: str,
    message: str | None = None,
    user_id: int | None = None,
) -> AdminNotification:
    notification = AdminNotification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
    )
    db.add(notification)
    await db.flush()
    return notification


async def list_notifications(
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
) -> dict:
    query = select(AdminNotification)

    if unread_only:
        query = query.where(AdminNotification.is_read == False)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    unread_result = await db.execute(
        select(func.count(AdminNotification.id)).where(AdminNotification.is_read == False)
    )
    unread_count = unread_result.scalar() or 0

    query = query.order_by(AdminNotification.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    notifications = result.scalars().all()

    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread_count,
    }


async def mark_read(db: AsyncSession, notification_id: int) -> AdminNotification | None:
    result = await db.execute(
        select(AdminNotification).where(AdminNotification.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    if notification:
        notification.is_read = True
        await db.flush()
    return notification


async def mark_all_read(db: AsyncSession) -> int:
    result = await db.execute(
        update(AdminNotification)
        .where(AdminNotification.is_read == False)
        .values(is_read=True)
    )
    await db.flush()
    return result.rowcount


async def get_unread_count(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(AdminNotification.id)).where(AdminNotification.is_read == False)
    )
    return result.scalar() or 0


async def get_recent_notifications(db: AsyncSession, limit: int = 10) -> list[AdminNotification]:
    result = await db.execute(
        select(AdminNotification)
        .order_by(AdminNotification.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
