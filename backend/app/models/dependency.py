from sqlalchemy import String, ForeignKey, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import RelationshipType


class Dependency(Base):
    __tablename__ = "dependencies"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    target_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    relationship_type: Mapped[RelationshipType] = mapped_column(SAEnum(RelationshipType), default=RelationshipType.DEPENDS_ON)
    description: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    source_task: Mapped["Task"] = relationship(back_populates="dependencies_as_source", foreign_keys=[source_id], lazy="selectin")
    target_task: Mapped["Task"] = relationship(back_populates="dependencies_as_target", foreign_keys=[target_id], lazy="selectin")


from app.models.task import Task
