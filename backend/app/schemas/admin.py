from pydantic import BaseModel, Field
from datetime import datetime


class AdminUserCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    username: str | None = Field(None, min_length=3, max_length=100)
    mobile_no: str | None = Field(None, max_length=30)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(default="viewer")


class AdminUserUpdate(BaseModel):
    email: str | None = None
    username: str | None = None
    mobile_no: str | None = None
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    avatar_url: str | None = None


class AdminUserResponse(BaseModel):
    id: int
    email: str
    username: str | None = None
    mobile_no: str | None = None
    full_name: str
    role: str
    organization_id: int
    organization_name: str | None = None
    avatar_url: str | None = None
    is_active: bool
    is_superadmin: bool = False
    stakeholder_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    users: list[AdminUserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    user_name: str | None = None
    user_email: str | None = None
    action: str
    resource_type: str
    resource_id: int | None = None
    ip_address: str | None = None
    status: str
    details: dict | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminNotificationResponse(BaseModel):
    id: int
    user_id: int | None = None
    notification_type: str
    title: str
    message: str | None = None
    is_read: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AdminNotificationListResponse(BaseModel):
    notifications: list[AdminNotificationResponse]
    total: int
    unread_count: int


class RolePermissionResponse(BaseModel):
    role: str
    permissions: list[str]
    user_count: int = 0


class SystemHealthResponse(BaseModel):
    server_uptime_seconds: float
    database_connected: bool
    database_response_ms: float
    api_status: str
    total_users: int
    active_users: int
    online_sessions: int
    radar_nodes_connected: int
    targets_tracked: int
    alerts_generated: int
    reports_generated: int
    error_count: int
    memory_usage_mb: float
    cpu_usage_percent: float


class AdminDashboardResponse(BaseModel):
    total_users: int
    active_users: int
    online_users: int
    radar_nodes: int
    targets_tracked: int
    alerts_generated: int
    reports_generated: int
    database_status: str
    server_health: str
    api_health: str
    recent_audit_logs: list[AuditLogResponse]
    recent_notifications: list[AdminNotificationResponse]
    users_by_role: dict[str, int]
