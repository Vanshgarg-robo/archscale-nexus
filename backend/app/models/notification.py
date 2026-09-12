from sqlalchemy import String, Text, ForeignKey, DateTime, func, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base
from app.models.enums import NotificationType


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    notification_type: Mapped[NotificationType] = mapped_column(SAEnum(NotificationType), default=NotificationType.GENERAL)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    related_entity_type: Mapped[str | None] = mapped_column(String(100))
    related_entity_id: Mapped[int | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="notifications", lazy="selectin")


from app.models.project import Project
