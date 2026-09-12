from sqlalchemy import String, Text, ForeignKey, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import IssueSeverity, IssueStatus


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    related_task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), index=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[IssueSeverity] = mapped_column(SAEnum(IssueSeverity), default=IssueSeverity.MEDIUM)
    status: Mapped[IssueStatus] = mapped_column(SAEnum(IssueStatus), default=IssueStatus.OPEN)
    resolution: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    related_task: Mapped["Task | None"] = relationship(back_populates="issues", lazy="selectin")


from app.models.task import Task
