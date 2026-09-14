from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.deps import require_role
from app.models.user import User
from app.schemas.admin import (
    AdminUserCreate, AdminUserUpdate, AdminUserResponse,
    AdminUserListResponse, PasswordResetRequest,
)
from app.services import admin_service, audit_service, admin_notification_service

router = APIRouter(prefix="/api/admin/users", tags=["Admin - Users"])


def _user_to_response(user: User) -> AdminUserResponse:
    org_name = user.organization.name if user.organization else None
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        mobile_no=user.mobile_no,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        organization_name=org_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_superadmin=user.is_superadmin,
        stakeholder_id=user.stakeholder_id,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login_at=user.last_login_at,
    )


@router.get("", response_model=AdminUserListResponse)
async def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    role: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await admin_service.list_users(
        db=db,
        organization_id=admin.organization_id,
        page=page,
        page_size=page_size,
        search=search,
        role_filter=role,
        status_filter=status_filter,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return AdminUserListResponse(
        users=[_user_to_response(u) for u in result["users"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )


@router.get("/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: int,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await admin_service.get_user_by_id(db, user_id)
    if not user or user.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_response(user)


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: AdminUserCreate,
    request: Request,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    try:
        user = await admin_service.create_user(
            db=db,
            organization_id=admin.organization_id,
            email=data.email,
            password=data.password,
            full_name=data.full_name,
            role=data.role,
            username=data.username,
            mobile_no=data.mobile_no,
        )
        await audit_service.log_event(
            db=db,
            user_id=admin.id,
            action="user_created",
            resource_type="user",
            resource_id=user.id,
            ip_address=request.client.host if request.client else None,
            details={"email": data.email, "role": data.role},
        )
        await admin_notification_service.create_notification(
            db=db,
            notification_type="user_created",
            title=f"New user created: {data.full_name}",
            message=f"User {data.email} was created with role {data.role} by {admin.full_name}",
        )
        await db.commit()
        await db.refresh(user)
        return _user_to_response(user)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    request: Request,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await admin_service.get_user_by_id(db, user_id)
    if not user or user.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    try:
        user = await admin_service.update_user(
            db=db,
            user=user,
            email=data.email,
            username=data.username,
            mobile_no=data.mobile_no,
            full_name=data.full_name,
            role=data.role,
            is_active=data.is_active,
            avatar_url=data.avatar_url,
        )
        details: dict = {"user_id": user_id}
        if data.role and data.role != old_role:
            details["role_changed"] = {"from": old_role, "to": data.role}
            await audit_service.log_event(
                db=db, user_id=admin.id, action="role_changed",
                resource_type="user", resource_id=user_id,
                ip_address=request.client.host if request.client else None,
                details=details,
            )
        else:
            await audit_service.log_event(
                db=db, user_id=admin.id, action="user_updated",
                resource_type="user", resource_id=user_id,
                ip_address=request.client.host if request.client else None,
                details=details,
            )
        await db.commit()
        await db.refresh(user)
        return _user_to_response(user)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await admin_service.get_user_by_id(db, user_id)
    if not user or user.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    email = user.email
    await admin_service.delete_user(db, user)
    await audit_service.log_event(
        db=db, user_id=admin.id, action="user_deleted",
        resource_type="user", resource_id=user_id,
        ip_address=request.client.host if request.client else None,
        details={"email": email},
    )
    await admin_notification_service.create_notification(
        db=db,
        notification_type="user_deleted",
        title=f"User deleted: {email}",
        message=f"User {email} was deleted by {admin.full_name}",
    )
    await db.commit()


@router.post("/{user_id}/toggle-status", response_model=AdminUserResponse)
async def toggle_user_status(
    user_id: int,
    request: Request,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await admin_service.get_user_by_id(db, user_id)
    if not user or user.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")

    user = await admin_service.toggle_user_status(db, user)
    action = "user_enabled" if user.is_active else "user_disabled"
    await audit_service.log_event(
        db=db, user_id=admin.id, action=action,
        resource_type="user", resource_id=user_id,
        ip_address=request.client.host if request.client else None,
    )
    if not user.is_active:
        await admin_notification_service.create_notification(
            db=db,
            notification_type="user_disabled",
            title=f"User disabled: {user.full_name}",
            message=f"User {user.email} was disabled by {admin.full_name}",
        )
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.post("/{user_id}/reset-password", response_model=AdminUserResponse)
async def reset_user_password(
    user_id: int,
    data: PasswordResetRequest,
    request: Request,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await admin_service.get_user_by_id(db, user_id)
    if not user or user.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="User not found")

    user = await admin_service.reset_user_password(db, user, data.new_password)
    await audit_service.log_event(
        db=db, user_id=admin.id, action="password_reset",
        resource_type="user", resource_id=user_id,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)
