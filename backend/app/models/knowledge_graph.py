from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.database import Base


class KnowledgeGraphNode(Base):
    __tablename__ = "knowledge_graph_nodes"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    node_type: Mapped[str] = mapped_column(String(50), nullable=False)  # task, stakeholder, approval, risk, etc.
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(Integer)  # ID of the linked entity
    status: Mapped[str | None] = mapped_column(String(50))
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    x_position: Mapped[float | None] = mapped_column(Float)
    y_position: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class KnowledgeGraphEdge(Base):
    __tablename__ = "knowledge_graph_edges"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    source_node_id: Mapped[int] = mapped_column(Integer, ForeignKey("knowledge_graph_nodes.id"), nullable=False)
    target_node_id: Mapped[int] = mapped_column(Integer, ForeignKey("knowledge_graph_nodes.id"), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(50), nullable=False)
    label: Mapped[str | None] = mapped_column(String(255))
    weight: Mapped[float | None] = mapped_column(Float, default=1.0)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
