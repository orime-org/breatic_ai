from __future__ import annotations
from typing import Optional, Any
from datetime import datetime, timezone
from app.utils.id_generator import generate_id

from sqlalchemy import (
    String,
    DateTime,
    func,
    Index
)
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy.dialects.postgresql import JSONB
from app.common.transactional import Base

class SnapshotTemplateNode(Base):
    """
    快照模版节点表
    """
    __tablename__ = "snapshot_template_node"
    
    __table_args__ = (
        Index("snapshot_template_node_snapshot_template_id", "snapshot_template_id"),
        {"schema": "public"}
    )

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_id,
        comment="主键"
    )
    snapshot_template_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="节点模板id")
    content: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True, comment="快照内容")
    create_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True, 
        server_default=func.now(), 
        default=lambda: datetime.now(timezone.utc), 
        comment="创建时间"
    )
    create_by: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="创建人")

    def __repr__(self) -> str:
        return f"<SnapshotTemplateNode id={self.id!r} snapshot_template_id={self.snapshot_template_id!r}>"