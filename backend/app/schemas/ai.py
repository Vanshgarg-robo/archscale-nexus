from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    project_id: int
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    response: str
    sources: list[str] = []


class ConversationUpload(BaseModel):
    project_id: int
    source_type: str
    content: str
    title: str | None = None


class ExtractionResult(BaseModel):
    tasks: list[dict] = []
    decisions: list[dict] = []
    risks: list[dict] = []
    action_items: list[dict] = []
    stakeholders: list[dict] = []
    deadlines: list[dict] = []
    summary: str = ""


class SummaryRequest(BaseModel):
    project_id: int
    summary_type: str = "project"


class SummaryResponse(BaseModel):
    summary: str
    key_points: list[str] = []
    recommendations: list[str] = []


class SimulationRequest(BaseModel):
    project_id: int
    scenario: str


class SimulationResponse(BaseModel):
    scenario: str
    affected_tasks: list[dict] = []
    affected_stakeholders: list[dict] = []
    estimated_delay_days: int = 0
    risk_score: float = 0.0
    dependency_impact: list[dict] = []
    recommendations: list[str] = []


class ImpactAnalysisRequest(BaseModel):
    project_id: int
    change_description: str
    affected_task_ids: list[int] = []


class ImpactAnalysisResponse(BaseModel):
    affected_stakeholders: list[dict] = []
    affected_tasks: list[dict] = []
    affected_vendors: list[dict] = []
    affected_approvals: list[dict] = []
    blocked_work: list[dict] = []
    risk_level: str = "medium"
    estimated_delay_days: int = 0
    recommendations: list[str] = []
    coordination_notes: str = ""


class BlockerAlert(BaseModel):
    id: int
    title: str
    blocker_type: str
    reason: str
    owner_name: str | None = None
    owner_id: int | None = None
    affected_task_id: int | None = None
    affected_task_title: str | None = None
    severity: str = "high"
    created_at: str | None = None


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    status: str | None = None
    role: str | None = None
    metadata: dict = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    relationship_type: str


class GraphData(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []


class DashboardData(BaseModel):
    health: dict = {}
    pending_approvals: list[dict] = []
    blockers: list[dict] = []
    risks: list[dict] = []
    recent_decisions: list[dict] = []
    stakeholder_activity: list[dict] = []
    recommendations: list[str] = []
    task_summary: dict = {}
    change_requests: list[dict] = []
