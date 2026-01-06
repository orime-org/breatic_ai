from datetime import datetime, timezone


from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    TIMESTAMP,
    func,
)
from app.common.transactional import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}  # 可选，指定 schema

    id = Column(String, primary_key=True, comment="主键")
    nickname = Column(String(64), comment="昵称")
    avatar = Column(String(512), comment="头像地址")
    subscription_id = Column(String(128), comment="Stripe/PayPal 订阅ID")

    free_credits = Column(Integer, default=400, comment="免费积分，每月重置")
    membership_credits = Column(Integer, default=0, comment="会员积分，每月重置")
    purchase_credits = Column(Integer, default=0, comment="购买积分，永久有效")
    project_count_limit = Column(Integer, default=10, comment="项目数量限制")

    membership_created_at = Column[datetime](TIMESTAMP(timezone=True), comment="会员购买时间")
    membership_expires_at = Column(TIMESTAMP(timezone=True), comment="会员到期时间")
    membership_level = Column(Integer, default=0, comment="会员等级，从0开始")
    membership_next_month_update_at = Column(TIMESTAMP(timezone=True), comment="会员积分下次更新")
    free_next_month_update_at = Column(TIMESTAMP(timezone=True), comment="免费积分下次更新")

    is_first_recharge = Column(Boolean, default=True, comment="是否首次充值")
    last_login_at = Column[datetime](TIMESTAMP(timezone=True), comment="最后登录时间")

    last_updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), comment="最近更新时间")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), default=lambda: datetime.now(timezone.utc), comment="创建时间")
    created_at_str = Column[str](String(32), comment="创建时间字符串")