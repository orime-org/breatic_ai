from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.transaction.model.recharge_history import RechargeHistory
from app.common.transactional import transactional
from datetime import datetime


@transactional()
async def update_recharge_history(user_id: str, token: str,recharge_status: str, current_time: datetime, session: AsyncSession):
    """
    更新用户充值历史记录为指定状态
    """
    stmt_upd = (
        update(RechargeHistory)
        .where(RechargeHistory.user_id == user_id, RechargeHistory.recharge_token == token)
        .values(
            recharge_status=recharge_status,
            update_time=current_time,
        ).returning(RechargeHistory.id)
    )
    await session.execute(stmt_upd)
