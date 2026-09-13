from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import require_role
from app.models.user import User
from app.schemas.admin import AuditLogResponse, AuditLogListResponse
from app.services import audit_service

router = APIRouter(prefix="/api/admin/audit-logs", tags=["Admin - Audit Logs"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str | None = Query(None),
    action: str | None = Query(None),
    user_id: int | None = Query(None),
    status: str | None = Query(None),
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await audit_service.list_audit_logs(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        action_filter=action,
        user_id_filter=user_id,
        status_filter=status,
    )
    logs = []
    for log in result["logs"]:
        user_name = log.user.full_name if log.user else None
        user_email = log.user.email if log.user else None
        logs.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_name=user_name,
            user_email=user_email,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            ip_address=log.ip_address,
            status=log.status,
            details=log.details,
            created_at=log.created_at,
        ))
    return AuditLogListResponse(
        logs=logs,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )
