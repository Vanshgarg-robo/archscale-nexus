from sqlalchemy import String, Text, ForeignKey, DateTime, func, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import ChangeRequestStatus


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str | None] = mapped_column(Text)
    affected_areas: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[ChangeRequestStatus] = mapped_column(SAEnum(ChangeRequestStatus), default=ChangeRequestStatus.PROPOSED)
    impact_summary: Mapped[str | None] = mapped_column(Text)
    estimated_delay_days: Mapped[int | None] = mapped_column()
    risk_level: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project: Mapped["Project"] = relationship(back_populates="change_requests", lazy="selectin")
    approvals: Mapped[list["Approval"]] = relationship(back_populates="change_request", lazy="selectin")


from app.models.project import Project
from app.models.approval import Approval
