import time
import os
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.session import Session as SessionModel
from app.models.admin_audit_log import AdminAuditLog
from app.models.notification import Notification
from app.models.project import Project
from app.models.task import Task

_start_time = time.time()


async def get_system_health(db: AsyncSession) -> dict:
    uptime = time.time() - _start_time

    db_connected = True
    db_response_ms = 0.0
    try:
        start = time.time()
        await db.execute(text("SELECT 1"))
        db_response_ms = round((time.time() - start) * 1000, 2)
    except Exception:
        db_connected = False
        db_response_ms = -1

    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    active_users_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    active_users = active_users_result.scalar() or 0

    online_sessions_result = await db.execute(
        select(func.count(SessionModel.id)).where(SessionModel.is_active == True)
    )
    online_sessions = online_sessions_result.scalar() or 0

    radar_nodes_result = await db.execute(select(func.count(Project.id)))
    radar_nodes = radar_nodes_result.scalar() or 0

    targets_result = await db.execute(select(func.count(Task.id)))
    targets_tracked = targets_result.scalar() or 0

    alerts_result = await db.execute(select(func.count(Notification.id)))
    alerts_generated = alerts_result.scalar() or 0

    audit_count_result = await db.execute(select(func.count(AdminAuditLog.id)))
    reports_generated = audit_count_result.scalar() or 0

    error_count_result = await db.execute(
        select(func.count(AdminAuditLog.id)).where(AdminAuditLog.status == "failure")
    )
    error_count = error_count_result.scalar() or 0

    try:
        import psutil
        process = psutil.Process(os.getpid())
        memory_mb = round(process.memory_info().rss / (1024 * 1024), 1)
        cpu_percent = process.cpu_percent(interval=0.1)
    except ImportError:
        memory_mb = 0.0
        cpu_percent = 0.0

    return {
        "server_uptime_seconds": round(uptime, 1),
        "database_connected": db_connected,
        "database_response_ms": db_response_ms,
        "api_status": "operational",
        "total_users": total_users,
        "active_users": active_users,
        "online_sessions": online_sessions,
        "radar_nodes_connected": radar_nodes,
        "targets_tracked": targets_tracked,
        "alerts_generated": alerts_generated,
        "reports_generated": reports_generated,
        "error_count": error_count,
        "memory_usage_mb": memory_mb,
        "cpu_usage_percent": cpu_percent,
    }


async def get_admin_dashboard_data(db: AsyncSession, organization_id: int) -> dict:
    health = await get_system_health(db)

    users_by_role_result = await db.execute(
        select(User.role, func.count(User.id))
        .where(User.organization_id == organization_id)
        .group_by(User.role)
    )
    users_by_role = {role: count for role, count in users_by_role_result.all()}

    db_status = "connected" if health["database_connected"] else "disconnected"
    server_health = "healthy" if health["server_uptime_seconds"] > 0 else "degraded"
    api_health = health["api_status"]

    return {
        "total_users": health["total_users"],
        "active_users": health["active_users"],
        "online_users": health["online_sessions"],
        "radar_nodes": health["radar_nodes_connected"],
        "targets_tracked": health["targets_tracked"],
        "alerts_generated": health["alerts_generated"],
        "reports_generated": health["reports_generated"],
        "database_status": db_status,
        "server_health": server_health,
        "api_health": api_health,
        "users_by_role": users_by_role,
    }
