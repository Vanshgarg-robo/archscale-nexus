import enum


class StakeholderRole(str, enum.Enum):
    CLIENT = "client"
    ARCHITECT = "architect"
    INTERIOR_DESIGNER = "interior_designer"
    STRUCTURAL_ENGINEER = "structural_engineer"
    ELECTRICAL_ENGINEER = "electrical_engineer"
    CONTRACTOR = "contractor"
    VENDOR = "vendor"
    PROJECT_MANAGER = "project_manager"
    SITE_SUPERVISOR = "site_supervisor"
    ADMINISTRATOR = "administrator"


class TaskStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RelationshipType(str, enum.Enum):
    DEPENDS_ON = "depends_on"
    BLOCKS = "blocks"
    REQUIRES_APPROVAL = "requires_approval"
    ASSIGNED_TO = "assigned_to"
    AFFECTED_BY = "affected_by"
    RELATED_TO = "related_to"
    APPROVED_BY = "approved_by"
    CREATED_BY = "created_by"
    RESOLVED_BY = "resolved_by"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    OVERDUE = "overdue"


class ChangeRequestStatus(str, enum.Enum):
    PROPOSED = "proposed"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"


class IssueSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class RiskCategory(str, enum.Enum):
    SCHEDULE = "schedule"
    APPROVAL = "approval"
    DEPENDENCY = "dependency"
    VENDOR = "vendor"
    COORDINATION = "coordination"


class RiskSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HealthStatus(str, enum.Enum):
    HEALTHY = "healthy"
    AT_RISK = "at_risk"
    CRITICAL = "critical"


class NotificationType(str, enum.Enum):
    CHANGE_IMPACT = "change_impact"
    DEPENDENCY_FAILURE = "dependency_failure"
    DEADLINE_APPROACHING = "deadline_approaching"
    APPROVAL_REQUIRED = "approval_required"
    BLOCKER_DETECTED = "blocker_detected"
    RISK_ESCALATION = "risk_escalation"
    GENERAL = "general"


class VendorStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    TERMINATED = "terminated"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    ARCHITECT = "architect"
    ENGINEER = "engineer"
    CONTRACTOR = "contractor"
    CLIENT = "client"
    VENDOR = "vendor"
    SITE_SUPERVISOR = "site_supervisor"
    ANALYST = "analyst"
    OPERATOR = "operator"
    VIEWER = "viewer"

