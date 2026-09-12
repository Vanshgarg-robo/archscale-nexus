from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import TaskStatus, TaskPriority


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.NOT_STARTED)
    priority: Mapped[TaskPriority] = mapped_column(SAEnum(TaskPriority), default=TaskPriority.MEDIUM)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estimated_days: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project: Mapped["Project"] = relationship(back_populates="tasks", lazy="selectin")
    assignee: Mapped["Stakeholder | None"] = relationship(back_populates="assigned_tasks", lazy="selectin")
    dependencies_as_source: Mapped[list["Dependency"]] = relationship(back_populates="source_task", foreign_keys="Dependency.source_id", lazy="selectin")
    dependencies_as_target: Mapped[list["Dependency"]] = relationship(back_populates="target_task", foreign_keys="Dependency.target_id", lazy="selectin")
    approvals: Mapped[list["Approval"]] = relationship(back_populates="related_task", lazy="selectin")
    issues: Mapped[list["Issue"]] = relationship(back_populates="related_task", lazy="selectin")


from app.models.project import Project
from app.models.stakeholder import Stakeholder
from app.models.dependency import Dependency
from app.models.approval import Approval
from app.models.issue import Issue
