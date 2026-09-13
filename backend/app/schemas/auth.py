from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)
    organization_name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(default="project_manager")


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization_id: int
    organization_name: str | None = None
    avatar_url: str | None = None
    is_active: bool
    stakeholder_id: int | None = None
    created_at: datetime | None = None
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    role: str | None = None


# ─── RBAC Permissions ──────────────────────────────────────────────

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": [
        "manage_users", "manage_organization", "manage_projects",
        "manage_stakeholders", "manage_tasks", "manage_approvals",
        "manage_change_requests", "manage_risks", "view_analytics",
        "manage_ai", "manage_settings", "manage_radar_nodes",
        "view_audit_logs", "manage_system_settings", "view_radar_data",
        "generate_reports", "export_reports", "view_dashboards",
        "manage_radar_operations", "view_targets", "view_reports",
    ],
    "project_manager": [
        "manage_projects", "manage_stakeholders", "manage_tasks",
        "manage_approvals", "manage_change_requests", "manage_risks",
        "view_analytics", "manage_ai",
    ],
    "architect": [
        "view_projects", "manage_tasks", "create_approvals",
        "manage_change_requests", "view_analytics", "manage_ai",
    ],
    "engineer": [
        "view_projects", "manage_tasks", "create_approvals",
        "view_change_requests", "view_analytics", "manage_ai",
    ],
    "contractor": [
        "view_projects", "view_tasks", "update_own_tasks",
        "view_approvals", "view_change_requests",
    ],
    "client": [
        "view_projects", "view_tasks", "create_approvals",
        "view_change_requests", "view_analytics",
    ],
    "vendor": [
        "view_projects", "view_tasks", "update_own_tasks",
        "view_approvals",
    ],
    "site_supervisor": [
        "view_projects", "manage_tasks", "view_approvals",
        "view_change_requests", "view_analytics",
    ],
    "analyst": [
        "view_radar_data", "generate_reports", "export_reports",
        "view_dashboards", "view_analytics", "view_projects",
        "view_tasks", "view_approvals", "view_change_requests",
    ],
    "operator": [
        "manage_radar_operations", "view_dashboards", "view_targets",
        "view_radar_data", "view_projects", "view_tasks",
    ],
    "viewer": [
        "view_dashboards", "view_reports", "view_projects",
        "view_tasks", "view_approvals",
    ],
}


def has_permission(role: str, permission: str) -> bool:
    """Check if a role has a specific permission."""
    return permission in ROLE_PERMISSIONS.get(role, [])


def get_permissions(role: str) -> list[str]:
    """Get all permissions for a role."""
    return ROLE_PERMISSIONS.get(role, [])
