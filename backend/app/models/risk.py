from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, func, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import RiskCategory, RiskSeverity


class Risk(Base):
    __tablename__ = "risks"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[RiskCategory] = mapped_column(SAEnum(RiskCategory), nullable=False)
    severity: Mapped[RiskSeverity] = mapped_column(SAEnum(RiskSeverity), default=RiskSeverity.MEDIUM)
    probability: Mapped[float] = mapped_column(Float, default=0.5)
    impact_score: Mapped[float] = mapped_column(Float, default=5.0)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    mitigation: Mapped[str | None] = mapped_column(Text)
    affected_task_ids: Mapped[dict | None] = mapped_column(JSON)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project: Mapped["Project"] = relationship(back_populates="risks", lazy="selectin")


from app.models.project import Project
