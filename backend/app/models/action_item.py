from sqlalchemy import String, Text, ForeignKey, DateTime, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    meeting_id: Mapped[int | None] = mapped_column(ForeignKey("meetings.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["Stakeholder"] = relationship(back_populates="action_items", lazy="selectin")
    meeting: Mapped["Meeting | None"] = relationship(back_populates="action_items", lazy="selectin")


from app.models.stakeholder import Stakeholder
from app.models.meeting import Meeting
