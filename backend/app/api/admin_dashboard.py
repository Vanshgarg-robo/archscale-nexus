from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import require_role
from app.models.user import User
from app.schemas.admin import (
    AdminDashboardResponse, SystemHealthResponse,
    AuditLogResponse, AdminNotificationResponse,
)
from app.services import system_monitor_service, audit_service, admin_notification_service

router = APIRouter(prefix="/api/admin", tags=["Admin - Dashboard"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    dashboard = await system_monitor_service.get_admin_dashboard_data(db, admin.organization_id)

    recent_logs = await audit_service.get_recent_audit_logs(db, limit=5)
    recent_notifications = await admin_notification_service.get_recent_notifications(db, limit=5)

    log_responses = []
    for log in recent_logs:
        log_responses.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_name=log.user.full_name if log.user else None,
            user_email=log.user.email if log.user else None,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            ip_address=log.ip_address,
            status=log.status,
            details=log.details,
            created_at=log.created_at,
        ))

    notif_responses = []
    for n in recent_notifications:
        notif_responses.append(AdminNotificationResponse(
            id=n.id,
            user_id=n.user_id,
            notification_type=n.notification_type,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at,
        ))

    return AdminDashboardResponse(
        total_users=dashboard["total_users"],
        active_users=dashboard["active_users"],
        online_users=dashboard["online_users"],
        radar_nodes=dashboard["radar_nodes"],
        targets_tracked=dashboard["targets_tracked"],
        alerts_generated=dashboard["alerts_generated"],
        reports_generated=dashboard["reports_generated"],
        database_status=dashboard["database_status"],
        server_health=dashboard["server_health"],
        api_health=dashboard["api_health"],
        recent_audit_logs=log_responses,
        recent_notifications=notif_responses,
        users_by_role=dashboard["users_by_role"],
    )


@router.get("/system-health", response_model=SystemHealthResponse)
async def get_system_health(
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    health = await system_monitor_service.get_system_health(db)
    return SystemHealthResponse(**health)
