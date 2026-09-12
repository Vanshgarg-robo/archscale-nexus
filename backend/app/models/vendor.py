from sqlalchemy import String, Text, ForeignKey, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.database import Base
from app.models.enums import VendorStatus


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    stakeholder_id: Mapped[int | None] = mapped_column(ForeignKey("stakeholders.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    contract_status: Mapped[VendorStatus] = mapped_column(SAEnum(VendorStatus), default=VendorStatus.ACTIVE)
    contract_value: Mapped[float | None] = mapped_column()
    delivery_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
