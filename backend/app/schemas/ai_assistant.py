from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: str | None = None  # session_uuid
    current_page: str | None = "/"
    project_id: int | None = 1
    stream: bool = True


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    tokens_used: int | None = 0
    model_used: str | None = None
    page_context: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    session_uuid: str
    message: ChatMessageResponse
    tokens_total: int
    response_time_ms: float


class AIAssistantSessionResponse(BaseModel):
    id: int
    session_uuid: str
    title: str
    current_page: str | None = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AIAssistantSessionDetail(BaseModel):
    id: int
    session_uuid: str
    title: str
    current_page: str | None = None
    messages: list[ChatMessageResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AIAssistantConfigResponse(BaseModel):
    is_enabled: bool
    model_name: str
    provider: str
    temperature: float
    max_tokens: int
    system_prompt: str
    rate_limit_per_minute: int
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AIAssistantConfigUpdate(BaseModel):
    is_enabled: bool | None = None
    model_name: str | None = None
    provider: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    system_prompt: str | None = None
    rate_limit_per_minute: int | None = None


class AIAssistantPublicConfig(BaseModel):
    is_enabled: bool
    model_name: str
    suggested_prompts: list[str] = []


class AIAssistantUsageStats(BaseModel):
    total_sessions: int
    total_messages: int
    total_tokens: int
    avg_latency_ms: float
    popular_routes: list[dict[str, Any]] = []
    daily_usage: list[dict[str, Any]] = []


class AIAssistantConversationSummary(BaseModel):
    id: int
    session_uuid: str
    user_name: str | None = None
    user_email: str | None = None
    title: str
    current_page: str | None = None
    message_count: int = 0
    total_tokens: int = 0
    created_at: datetime
    updated_at: datetime
