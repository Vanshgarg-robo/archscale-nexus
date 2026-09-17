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


async def log_approval_activity(
    db: AsyncSession,
    user: any,
    action: str,  # "APPROVED", "REJECTED", "SUBMITTED"
    task_id: int | None,
    task_title: str,
    previous_status: str,
    new_status: str,
    project_id: int,
    reason: str | None = None,
    comments: str | None = None,
) -> AdminAuditLog:
    actor_name = getattr(user, "full_name", None) or getattr(user, "username", None) or getattr(user, "email", "User")
    role = getattr(user, "role", "unknown")
    user_id = getattr(user, "id", 1)
    stakeholder_id = getattr(user, "stakeholder_id", None)

    if action.upper() == "APPROVED":
        readable_action = f"{actor_name} approved Task #{task_id}: {task_title}"
    elif action.upper() == "REJECTED":
        reason_text = f" (Reason: {reason})" if reason else ""
        readable_action = f"{actor_name} rejected Task #{task_id}: {task_title}{reason_text}"
    elif action.upper() == "SUBMITTED":
        readable_action = f"{actor_name} submitted Task #{task_id}: {task_title} for approval"
    else:
        readable_action = f"{actor_name} updated Task #{task_id}: {task_title} to {new_status}"

    details = {
        "user_name": actor_name,
        "user_role": role,
        "task_id": task_id,
        "task_title": task_title,
        "previous_status": previous_status,
        "new_status": new_status,
        "project_id": project_id,
        "reason": reason,
        "comments": comments,
        "summary": readable_action,
    }

    admin_log = AdminAuditLog(
        user_id=user_id,
        action=f"TASK_{action.upper()}",
        resource_type="task",
        resource_id=task_id,
        status="success",
        details=details,
    )
    db.add(admin_log)

    try:
        from app.models.audit_event import AuditEvent
        proj_event = AuditEvent(
            project_id=project_id,
            actor_id=stakeholder_id,
            event_type=f"TASK_{action.upper()}",
            entity_type="task",
            entity_id=task_id or 0,
            description=readable_action,
            changes={"previous_status": previous_status, "new_status": new_status, "reason": reason, "comments": comments},
        )
        db.add(proj_event)
    except Exception:
        pass

    await db.flush()
    return admin_log

