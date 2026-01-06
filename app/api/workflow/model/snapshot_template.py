from __future__ import annotations
from typing import Optional
from datetime import datetime, timezone

from sqlalchemy import (
    String,
    DateTime,
    func,
    Index,
    Integer
)
from sqlalchemy.orm import mapped_column, Mapped
from app.common.transactional import Base
from app.utils.id_generator import generate_id

class SnapshotTemplate(Base):
    """
    快照模版表
    """
    __tablename__ = "snapshot_template"
    
    __table_args__ = (
        Index("idx_snapshot_template_workflow", "workflow_id"),
        Index("idx_snapshot_template_node_tpl", "node_template_id"),
        {"schema": "public"}
    )

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_id,
        comment="主键"
    )
    node_template_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="节点模板id")
    user_id: Mapped[str | None] = mapped_column(String, nullable=True, comment="用户id")
    workflow_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="工作流id")
    node_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="节点id")
    snapshot_template_name: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="快照模版名称")
    snapshot_screen_pic: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="快照节点缩略图")
    remark: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="备注")
    create_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True, 
        server_default=func.now(), 
        default=lambda: datetime.now(timezone.utc), 
        comment="创建时间"
    )
    create_by: Mapped[Optional[str]] = mapped_column(String, nullable=True, comment="创建人")
    is_delete: Mapped[int | None] = mapped_column(Integer, nullable=True,default=0, comment="是否删除（0：未删除，1：已删除）")

    def __repr__(self) -> str:
        return f"<NodeSnapshot id={self.id!r} workflow_id={self.workflow_id!r}>"