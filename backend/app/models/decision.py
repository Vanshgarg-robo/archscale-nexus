from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    decided_by_id: Mapped[int] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text)
    context: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="decisions", lazy="selectin")
    decided_by_stakeholder: Mapped["Stakeholder"] = relationship(back_populates="decisions_made", lazy="selectin")


from app.models.project import Project
from app.models.stakeholder import Stakeholder
