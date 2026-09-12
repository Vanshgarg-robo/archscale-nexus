from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import ProjectStatus, HealthStatus


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ProjectStatus] = mapped_column(SAEnum(ProjectStatus), default=ProjectStatus.PLANNING)
    health_score: Mapped[float] = mapped_column(Float, default=100.0)
    health_status: Mapped[HealthStatus] = mapped_column(SAEnum(HealthStatus), default=HealthStatus.HEALTHY)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    target_end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    location: Mapped[str | None] = mapped_column(String(500))
    budget: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="projects", lazy="selectin")
    tasks: Mapped[list["Task"]] = relationship(back_populates="project", lazy="selectin")
    stakeholder_assignments: Mapped[list["ProjectStakeholder"]] = relationship(back_populates="project", lazy="selectin")
    change_requests: Mapped[list["ChangeRequest"]] = relationship(back_populates="project", lazy="selectin")
    risks: Mapped[list["Risk"]] = relationship(back_populates="project", lazy="selectin")
    health_snapshots: Mapped[list["HealthSnapshot"]] = relationship(back_populates="project", lazy="selectin")
    meetings: Mapped[list["Meeting"]] = relationship(back_populates="project", lazy="selectin")
    decisions: Mapped[list["Decision"]] = relationship(back_populates="project", lazy="selectin")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="project", lazy="selectin")
    audit_events: Mapped[list["AuditEvent"]] = relationship(back_populates="project", lazy="selectin")


class ProjectStakeholder(Base):
    __tablename__ = "project_stakeholders"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    stakeholder_id: Mapped[int] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    responsibility_areas: Mapped[str | None] = mapped_column(Text)
    approval_authority: Mapped[bool] = mapped_column(default=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="stakeholder_assignments", lazy="selectin")
    stakeholder: Mapped["Stakeholder"] = relationship(back_populates="project_assignments", lazy="selectin")


from app.models.organization import Organization
from app.models.stakeholder import Stakeholder
from app.models.task import Task
from app.models.change_request import ChangeRequest
from app.models.risk import Risk
from app.models.health_snapshot import HealthSnapshot
from app.models.meeting import Meeting
from app.models.decision import Decision
from app.models.notification import Notification
from app.models.audit_event import AuditEvent
