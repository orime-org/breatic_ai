from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Integer, String, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column
from app.utils.id_generator import get_snowflake_id
from app.common.transactional import Base
from app.utils.id_generator import generate_id

class CreditsUsedHistory(Base):
    __tablename__ = "credits_used_history"
    __table_args__ = {"schema": "public"}

    # BIGINT 主键（不自增；适配你自己的雪花/发号器）
    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_id,
        comment="主键"
    )

    user_id: Mapped[str] = mapped_column(
        String,
        nullable=False,
        comment="用户ID",
    )

    credits_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
        comment="积分类型",
    )
    
    used_channel: Mapped[str] = mapped_column(
        String,
        nullable=False,
        comment="使用渠道",
    )

    used_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
        comment="使用类型",
    )

    used_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="使用积分",
    )

    used_time: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="使用时间（默认当前）",
    )

    used_token: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
        comment="幂等令牌",
    )

    create_time: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="创建时间（默认当前）",
    )
