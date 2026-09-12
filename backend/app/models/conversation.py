from sqlalchemy import String, Text, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(100))
    title: Mapped[str | None] = mapped_column(String(500))
    raw_content: Mapped[str | None] = mapped_column(Text)
    extracted_tasks: Mapped[dict | None] = mapped_column(JSON)
    extracted_decisions: Mapped[dict | None] = mapped_column(JSON)
    extracted_risks: Mapped[dict | None] = mapped_column(JSON)
    extracted_action_items: Mapped[dict | None] = mapped_column(JSON)
    extracted_stakeholders: Mapped[dict | None] = mapped_column(JSON)
    extracted_deadlines: Mapped[dict | None] = mapped_column(JSON)
    summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
