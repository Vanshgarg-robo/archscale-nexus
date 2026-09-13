from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.deps import require_role
from app.models.user import User
from app.schemas.auth import ROLE_PERMISSIONS
from app.schemas.admin import RolePermissionResponse

router = APIRouter(prefix="/api/admin/roles", tags=["Admin - Roles"])


@router.get("", response_model=list[RolePermissionResponse])
async def list_roles(
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    roles = []
    for role_name, permissions in ROLE_PERMISSIONS.items():
        count_result = await db.execute(
            select(func.count(User.id)).where(
                User.role == role_name,
                User.organization_id == admin.organization_id,
            )
        )
        user_count = count_result.scalar() or 0
        roles.append(RolePermissionResponse(
            role=role_name,
            permissions=permissions,
            user_count=user_count,
        ))
    return roles


@router.get("/{role_name}", response_model=RolePermissionResponse)
async def get_role(
    role_name: str,
    admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    if role_name not in ROLE_PERMISSIONS:
        raise HTTPException(status_code=404, detail="Role not found")

    count_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == role_name,
            User.organization_id == admin.organization_id,
        )
    )
    user_count = count_result.scalar() or 0
    return RolePermissionResponse(
        role=role_name,
        permissions=ROLE_PERMISSIONS[role_name],
        user_count=user_count,
    )
