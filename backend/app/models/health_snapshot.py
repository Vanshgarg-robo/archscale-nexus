from sqlalchemy import Float, ForeignKey, DateTime, func, JSON, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import HealthStatus


class HealthSnapshot(Base):
    __tablename__ = "health_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[HealthStatus] = mapped_column(SAEnum(HealthStatus), nullable=False)
    overdue_tasks: Mapped[int] = mapped_column(default=0)
    pending_approvals: Mapped[int] = mapped_column(default=0)
    blocker_count: Mapped[int] = mapped_column(default=0)
    risk_count: Mapped[int] = mapped_column(default=0)
    dependency_failures: Mapped[int] = mapped_column(default=0)
    metrics: Mapped[dict | None] = mapped_column(JSON)
    summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="health_snapshots", lazy="selectin")


from app.models.project import Project
