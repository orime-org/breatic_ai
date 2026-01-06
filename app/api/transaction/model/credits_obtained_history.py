from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Integer,
    String,
    TIMESTAMP,
    func,
    Index,
    text,
)
from app.utils.id_generator import get_snowflake_id
from app.common.transactional import Base
from sqlalchemy.orm import Mapped, mapped_column
from app.utils.id_generator import generate_id

class CreditsObtainedHistory(Base):
    __tablename__ = "credits_obtained_history"
    __table_args__ = (
        {"schema": "public", "comment": "积分获得记录表"},
    )

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_id,
        comment="主键"
    )

    user_id: Mapped[str] = mapped_column(
        String,
        nullable=False,
        comment="用户id",
    )

    credits_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
        comment="积分类型",
    )

    obtained_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="获得积分（>0）",
    )

    recharge_history_id: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
        comment="充值记录id（若来源于充值）",
    )

    obtained_time: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="获得/充值时间（timestamptz）",
    )

    create_time: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="创建时间（timestamptz）",
    )