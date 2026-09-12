from app.schemas.common import TimestampMixin, PaginatedResponse
from app.schemas.organization import OrganizationCreate, OrganizationRead
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.stakeholder import StakeholderCreate, StakeholderRead, StakeholderUpdate, StakeholderMatrix, StakeholderWorkload
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.schemas.dependency import DependencyCreate, DependencyRead, DependencyChain
from app.schemas.approval import ApprovalCreate, ApprovalRead, ApprovalUpdate
from app.schemas.change_request import ChangeRequestCreate, ChangeRequestRead, ChangeRequestUpdate
from app.schemas.risk import RiskCreate, RiskRead, RiskUpdate
from app.schemas.notification import NotificationRead
from app.schemas.health import HealthRead, HealthHistory
from app.schemas.ai import (
    ChatRequest, ChatResponse, ConversationUpload, ExtractionResult,
    SummaryRequest, SummaryResponse, SimulationRequest, SimulationResponse,
    ImpactAnalysisRequest, ImpactAnalysisResponse, BlockerAlert,
    GraphNode, GraphEdge, GraphData, DashboardData, ChatMessage,
)
