from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import StakeholderRole


class Stakeholder(Base):
    __tablename__ = "stakeholders"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
    role: Mapped[StakeholderRole] = mapped_column(SAEnum(StakeholderRole), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    influence_score: Mapped[float] = mapped_column(Float, default=50.0)
    workload_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="stakeholders", lazy="selectin")
    project_assignments: Mapped[list["ProjectStakeholder"]] = relationship(back_populates="stakeholder")
    assigned_tasks: Mapped[list["Task"]] = relationship(back_populates="assignee")
    requested_approvals: Mapped[list["Approval"]] = relationship(back_populates="requester", foreign_keys="Approval.requester_id")
    reviewing_approvals: Mapped[list["Approval"]] = relationship(back_populates="approver", foreign_keys="Approval.approver_id")
    decisions_made: Mapped[list["Decision"]] = relationship(back_populates="decided_by_stakeholder")
    action_items: Mapped[list["ActionItem"]] = relationship(back_populates="owner")


from app.models.organization import Organization
from app.models.project import ProjectStakeholder
from app.models.task import Task
from app.models.approval import Approval
from app.models.decision import Decision
from app.models.action_item import ActionItem
