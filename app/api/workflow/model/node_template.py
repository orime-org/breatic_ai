from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    String,
    Integer,
    DateTime,
    func
)
from sqlalchemy.dialects.postgresql import JSONB

from datetime import datetime, timezone
from app.common.transactional import Base
from app.utils.id_generator import generate_id

class NodeTemplate(Base):
    __tablename__ = "node_template"
    __table_args__ = {"schema": "public"}  # 指定 schema

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_id,
        comment="主键"
    )
    template_name: Mapped[str | None] = mapped_column(String, nullable=True, comment="模板名称")
    template_code: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="模版code码")
    group_type: Mapped[str | None] = mapped_column(String, nullable=True, comment="模板类型")
    group_type_code: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="模板类型code码")
    group_type_icon: Mapped[str | None] = mapped_column(String, nullable=True, comment="模板类型图标")
    group_type_sort_level: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="分组排序值")
    language_code: Mapped[str | None] = mapped_column(String, nullable=True, comment="国际化")
    template_icon: Mapped[str | None] = mapped_column(String, nullable=True, comment="模版图标")
    sort_level: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="等级（用于前端显示顺序）")
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True, comment="模板内容")
    remark: Mapped[str | None] = mapped_column(String, nullable=True, comment="备注")
    create_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True,server_default=func.now(),default=lambda: datetime.now(timezone.utc), comment="创建时间")
    create_by: Mapped[str | None] = mapped_column(String, nullable=True, comment="创建人")