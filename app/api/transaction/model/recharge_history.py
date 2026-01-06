from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy.dialects.postgresql import UUID, JSONB
from decimal import Decimal
from sqlalchemy import (
    BigInteger,
    String,
    TIMESTAMP,
    func,
    Index,
    text,
    Integer,
    Numeric,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from app.utils.id_generator import get_snowflake_id
from app.common.transactional import Base
from app.utils.id_generator import generate_id

class RechargeHistory(Base):

    __tablename__ = "recharge_history"
    __table_args__ = {"schema": "public"}
    
    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_id,
        comment="主键"
    )

    user_id: Mapped[str] = mapped_column(
        String, nullable=False, comment="用户id"
    )

    recharge_remote_id: Mapped[str] = mapped_column(
        String, nullable=False, comment="用户id"
    )
    
    recharge_type: Mapped[str] = mapped_column(
        String, nullable=False, comment="交易类型"
    )

    # # 若按最小货币单位存储（如“分”），此列用 BIGINT
    # recharge_amount: Mapped[int] = mapped_column(
    #     BigInteger, nullable=False, comment="交易金额（两位小数，按最小货币单位存储）"
    # )
    recharge_amount: Mapped[Decimal] =mapped_column(Numeric(12, 2, asdecimal=True), nullable=False)

    recharge_membership_level: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="会员等级"
    )

    recharge_credits: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="获得积分"
    )

    recharge_channel: Mapped[str] = mapped_column(
        String, nullable=False, comment="支付渠道"
    )

    recharge_time: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="交易时间（timestamptz）",
    )

    recharge_status: Mapped[str] = mapped_column(
        String, nullable=False, comment="交易状态"
    )

    recharge_item_id: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, comment="关联套餐"
    )

    recharge_token: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, comment="幂等令牌"
    )

    recharge_extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True, comment="额外信息")

    remark: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, comment="备注"
    )

    create_time: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="创建时间（timestamptz）",
    )

    update_time: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="更新时间（触发器维护）",
    )