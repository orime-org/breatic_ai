from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.common.transactional import Base
from sqlalchemy import func
from datetime import datetime, timezone
from app.utils.db_model import UpdatableMixin
from app.utils.id_generator import generate_id

class Workflow(Base, UpdatableMixin):
    __tablename__ = "workflow"
    __table_args__ = {"schema": "public"}  # 指定 schema

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_id,
        comment="主键"
    )
    user_id: Mapped[str | None] = mapped_column(String, nullable=True, comment="用户id")
    workflow_name: Mapped[str | None] = mapped_column(String, nullable=True, comment="工作流名称")
    workflow_icon: Mapped[str | None] = mapped_column(String, nullable=True, comment="工作流图标")
    workflow_screen_pic: Mapped[str | None] = mapped_column(String, nullable=True, comment="工作流缩略图")
    workflow_version: Mapped[str | None] = mapped_column(String, nullable=True,default="1.0", comment="当前工作流版本")
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True, comment="工作流内容")
    remark: Mapped[str | None] = mapped_column(String, nullable=True, comment="备注")
    create_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True),server_default=func.now(), default=lambda: datetime.now(timezone.utc), nullable=True, comment="创建时间")
    update_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True),server_default=func.now(), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=True, comment="更新时间")
    create_by: Mapped[str | None] = mapped_column(String, nullable=True, comment="创建人")
    is_delete: Mapped[int | None] = mapped_column(Integer, nullable=True,default=0, comment="是否删除（0：未删除，1：已删除）")


    __updatable_fields__ = (
        "user_id","workflow_name","workflow_icon","workflow_screen_pic","workflow_version","content","remark"
    )
    __json_merge_fields__ = ("content",)