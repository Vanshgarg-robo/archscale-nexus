from sqlalchemy import String, Text, ForeignKey, DateTime, func, Integer, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base


class AIAssistantSession(Base):
    """Conversation session for the ArchScale Nexus AI Assistant."""
    __tablename__ = "ai_assistant_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_uuid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), default="New Architecture Conversation")
    current_page: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    messages: Mapped[list["AIAssistantMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="AIAssistantMessage.id"
    )


class AIAssistantMessage(Base):
    """Individual message within an AI Assistant conversation session."""
    __tablename__ = "ai_assistant_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("ai_assistant_sessions.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))  # 'user', 'assistant', 'system'
    content: Mapped[str] = mapped_column(Text)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    page_context: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["AIAssistantSession"] = relationship(back_populates="messages")


class AIAssistantConfig(Base):
    """Global admin configuration for the AI Assistant."""
    __tablename__ = "ai_assistant_config"

    id: Mapped[int] = mapped_column(primary_key=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    model_name: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini")
    provider: Mapped[str] = mapped_column(String(50), default="openai")  # 'openai', 'gemini'
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, default=2000)
    system_prompt: Mapped[str] = mapped_column(
        Text,
        default=(
            "You are the ArchScale Nexus Architecture & System Intelligence AI Assistant.\n"
            "You possess deep expertise in:\n"
            "- System Architecture & Microservices (event-driven, gRPC, saga, circuit breakers)\n"
            "- Databases (PostgreSQL, Neon, SQLite, Redis caching, indexing, schema design)\n"
            "- API Design (RESTful standards, OpenAPI 3.1, idempotency, rate limiting, WebSockets)\n"
            "- Cloud Infrastructure & Kubernetes (AWS, GCP, EKS, HPA, VPC, CDN edge caching)\n"
            "- Scaling Strategies (horizontal scaling, sharding, read replicas, queue offloading)\n"
            "- DevOps & CI/CD Pipelines (GitHub Actions, ArgoCD, canary deployments, Docker)\n"
            "- Security Best Practices (Zero-Trust, mTLS, OAuth2/OIDC, RBAC, OWASP Top 10)\n\n"
            "Format your answers with clean markdown, headers, bullet points, and code blocks with language tags.\n"
            "When explaining system diagrams, use ASCII flowcharts and structured block representations.\n"
            "Ground your architectural insights in the ArchScale Nexus platform context and the user's active page."
        ),
    )
    rate_limit_per_minute: Mapped[int] = mapped_column(Integer, default=30)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    updated_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class AIAssistantUsage(Base):
    """Audit and analytics log of AI Assistant usage."""
    __tablename__ = "ai_assistant_usage"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    session_id: Mapped[int | None] = mapped_column(
        ForeignKey("ai_assistant_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    endpoint: Mapped[str] = mapped_column(String(100), default="chat_stream")
    tokens_prompt: Mapped[int] = mapped_column(Integer, default=0)
    tokens_completion: Mapped[int] = mapped_column(Integer, default=0)
    tokens_total: Mapped[int] = mapped_column(Integer, default=0)
    page_route: Mapped[str | None] = mapped_column(String(255), nullable=True)
    response_time_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
