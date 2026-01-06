from sqlalchemy import (
    Column,
    String,
    TIMESTAMP,
    func,
    String,
)
from datetime import datetime, timezone
from app.common.transactional import Base

class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = {"schema": "public"}  # 可选，指定 schema
    
    id = Column(String, primary_key=True, comment="主键")
    email = Column(String(255), nullable=False, comment="邮箱")
    status = Column[str](String(32), default="active", comment="状态（active / inactive）")
    account_type = Column(String(32), nullable=False, comment="账号类型：email / google / github / tiktok")
    user_id = Column(String(64), nullable=False, comment="用户ID")
    
    verification_code = Column(String(64), comment="验证码")
    verify_token = Column(String(64), comment="验证token")
    code_created_at = Column(TIMESTAMP(timezone=True), comment="验证码创建时间")
    code_expires_at = Column(TIMESTAMP(timezone=True), comment="验证码过期时间")

    last_updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        default=lambda: datetime.now(timezone.utc),
        comment="最后更新时间"
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        comment="创建时间"
    )
    created_at_str = Column(String(32), comment="创建时间字符串")