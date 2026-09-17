from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import Settings, get_settings
from app.models.user import User
from app.services.auth_service import decode_token, get_user_by_id
from app.schemas.auth import has_permission

security = HTTPBearer(auto_error=False)


async def get_session(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    return db


def get_app_settings() -> Settings:
    return get_settings()


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> User:
    """Extract and validate the current user from the JWT access token.
    Raises 401 if token is missing/invalid/expired or user not found."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = await get_user_by_id(db, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def get_current_user_optional(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> User | None:
    """Like get_current_user but returns None instead of raising 401.
    Used for endpoints that work with or without authentication."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if not payload or payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        return await get_user_by_id(db, int(user_id))
    except Exception:
        return None


def require_permission(permission: str):
    """Dependency factory that checks if the current user has a specific permission."""
    async def _check(user: User = Depends(get_current_user)):
        if not has_permission(user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required",
            )
        return user
    return _check


def require_role(*roles: str):
    """Dependency factory that checks if the current user has one of the specified roles."""
    async def _check(user: User = Depends(get_current_user)):
        if user.role not in roles and not user.is_superadmin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {user.role} not authorized. Required: {', '.join(roles)}",
            )
        return user
    return _check


def require_not_viewer(user: User):
    """Enforce that Viewer role has strictly read-only access."""
    if user.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Viewer accounts have read-only access",
        )
    return user


async def verify_project_access(
    project_id: int,
    user: User,
    db: AsyncSession,
    allow_admin_coordination: bool = True,
):
    """Verifies that the user has legitimate access to the given project.
    Enforces tenant and partner boundaries across all roles."""
    from sqlalchemy import select
    from app.models.project import Project, ProjectStakeholder

    proj_res = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if not allow_admin_coordination and (user.role == "admin" or user.is_superadmin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Client confidential resources are isolated from administrative oversight",
        )

    if user.is_superadmin:
        return project

    role = user.role

    if role == "admin":
        if allow_admin_coordination:
            return project

    if role == "client":
        if project.client_id == user.id:
            return project
        if user.stakeholder_id:
            stk_res = await db.execute(
                select(ProjectStakeholder).where(
                    ProjectStakeholder.project_id == project_id,
                    ProjectStakeholder.stakeholder_id == user.stakeholder_id,
                )
            )
            if stk_res.scalar_one_or_none():
                return project
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not own or participate in this project",
        )

    # Any user with an assigned stakeholder profile must be assigned to this project
    if user.stakeholder_id:
        stk_res = await db.execute(
            select(ProjectStakeholder).where(
                ProjectStakeholder.project_id == project_id,
                ProjectStakeholder.stakeholder_id == user.stakeholder_id,
            )
        )
        if stk_res.scalar_one_or_none():
            return project
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not assigned to this project",
        )

    # General internal platform roles without individual project stakeholder assignments
    if role in ("admin", "analyst", "operator", "viewer"):
        return project

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: You are not assigned to this project",
    )
