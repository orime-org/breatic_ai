from app.api.transaction.model.recharge_history import RechargeHistory
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,func
from app.common.transactional import transactional
from app.utils.db_page import clamp_page

@transactional()
async def query_user_recharge_record(session: AsyncSession,page, page_size, user_id, rechargeStatus: str | None = None) -> dict:
    """
    查询用户充值记录
    :param page: 页码
    :param page_size: 每页数量
    :param user_id: 用户ID
    :return: 充值记录列表
    """
    page,page_size,offset = clamp_page(page=page,page_size=page_size)
   
    conditions = [RechargeHistory.user_id == user_id]
    if rechargeStatus and rechargeStatus != "all":
        # 直接使用数据库中的状态：created、completed、failed、canceled、renewed
        if rechargeStatus in ["created", "completed", "failed", "canceled","subscribed", "renewed"]:
            conditions.append(RechargeHistory.recharge_status == rechargeStatus)

    stmt = select(RechargeHistory.id,RechargeHistory.recharge_time,RechargeHistory.recharge_type,RechargeHistory.recharge_amount,RechargeHistory.recharge_token,RechargeHistory.recharge_status,RechargeHistory.recharge_credits,RechargeHistory.recharge_membership_level).where(*conditions).offset(offset).limit(page_size).order_by(RechargeHistory.recharge_time.desc())
    count_stmt = select(func.count(RechargeHistory.id)).where(*conditions)

    result = await session.execute(stmt)
    count_result = await session.execute(count_stmt)

    records = [{"id": r[0],"recharge_time":r[1],"recharge_type":r[2],"recharge_amount":r[3],"recharge_token":r[4],"recharge_status":r[5],"recharge_credits":r[6],"recharge_membership_level":r[7]} for r in result.all()]
    total_count = count_result.scalar()
    total_pages = (total_count + page_size - 1) // page_size

    return {
        "records": records,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }