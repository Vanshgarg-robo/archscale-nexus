from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255))
    subscription_tier: Mapped[str] = mapped_column(String(50), default="professional")
    logo_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projects: Mapped[list["Project"]] = relationship(back_populates="organization", lazy="selectin")
    stakeholders: Mapped[list["Stakeholder"]] = relationship(back_populates="organization", lazy="selectin")
    users: Mapped[list["User"]] = relationship(back_populates="organization", lazy="selectin")


from app.models.project import Project
from app.models.stakeholder import Stakeholder
from app.models.user import User
