from sqlalchemy import String, Text, ForeignKey, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import ApprovalStatus


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    related_task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), index=True)
    change_request_id: Mapped[int | None] = mapped_column(ForeignKey("change_requests.id"), index=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    approver_id: Mapped[int] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ApprovalStatus] = mapped_column(SAEnum(ApprovalStatus), default=ApprovalStatus.PENDING)
    approval_type: Mapped[str] = mapped_column(String(100), default="general")
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    rejection_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    decided_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    requester: Mapped["Stakeholder"] = relationship(back_populates="requested_approvals", foreign_keys=[requester_id], lazy="selectin")
    approver: Mapped["Stakeholder"] = relationship(back_populates="reviewing_approvals", foreign_keys=[approver_id], lazy="selectin")
    related_task: Mapped["Task | None"] = relationship(back_populates="approvals", lazy="selectin")
    change_request: Mapped["ChangeRequest | None"] = relationship(back_populates="approvals", lazy="selectin")


from app.models.stakeholder import Stakeholder
from app.models.task import Task
from app.models.change_request import ChangeRequest
