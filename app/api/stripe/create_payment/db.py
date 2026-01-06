from app.api.transaction.model.recharge_history import RechargeHistory
from app.common.transactional import transactional
from sqlalchemy.ext.asyncio import AsyncSession

@transactional()
async def insert_recharge_history(recharge_history: RechargeHistory, session: AsyncSession):
    session.add(recharge_history)
    await session.flush()
