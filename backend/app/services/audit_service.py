from datetime import datetime, timezone
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.admin_audit_log import AdminAuditLog
import math


async def log_event(
    db: AsyncSession,
    user_id: int,
    action: str,
    resource_type: str,
    resource_id: int | None = None,
    ip_address: str | None = None,
    status: str = "success",
    details: dict | None = None,
) -> AdminAuditLog:
    log = AdminAuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        status=status,
        details=details,
    )
    db.add(log)
    await db.flush()
    return log


async def list_audit_logs(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    action_filter: str | None = None,
    user_id_filter: int | None = None,
    status_filter: str | None = None,
) -> dict:
    query = select(AdminAuditLog)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                AdminAuditLog.action.ilike(search_term),
                AdminAuditLog.resource_type.ilike(search_term),
            )
        )

    if action_filter:
        query = query.where(AdminAuditLog.action == action_filter)

    if user_id_filter:
        query = query.where(AdminAuditLog.user_id == user_id_filter)

    if status_filter:
        query = query.where(AdminAuditLog.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(AdminAuditLog.created_at.desc())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    total_pages = max(1, math.ceil(total / page_size))

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


async def get_recent_audit_logs(db: AsyncSession, limit: int = 10) -> list[AdminAuditLog]:
    result = await db.execute(
        select(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_audit_log_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count(AdminAuditLog.id)))
    return result.scalar() or 0
