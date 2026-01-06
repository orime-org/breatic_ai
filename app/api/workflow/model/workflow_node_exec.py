from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.common.transactional import Base
from sqlalchemy import func
from sqlalchemy import Integer, String, DateTime
from app.utils.id_generator import generate_id

class WorkflowNodeExec(Base):
    __tablename__ = "workflow_node_exec"
    __table_args__ = {"schema": "public"}  # 指定 schema

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_id,  
        comment="主键"
    )
    user_id: Mapped[str | None] = mapped_column(String, nullable=True, comment="用户id")
    workflow_id: Mapped[str | None] = mapped_column(String, nullable=True, comment="工作流id")
    node_id: Mapped[str | None] = mapped_column(String, nullable=True, comment="节点id")
    node_content: Mapped[dict | None] = mapped_column(JSONB, nullable=True, comment="节点内容")
    exec_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True, comment="执行结果")
    exec_time: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="执行时间（单位秒/毫秒需根据业务定义）")
    create_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True),server_default=func.now(),default=lambda: datetime.now(timezone.utc), nullable=True, comment="创建时间")
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True),server_default=func.now(), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=True, comment="更新时间")
    template_node_code: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="模板节点code")
    create_by: Mapped[str | None] = mapped_column(String, nullable=True, comment="创建人")
