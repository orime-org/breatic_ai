from app.api.transaction.model.recharge_history import RechargeHistory
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,func,update
from app.common.transactional import transactional
from datetime import datetime
from app.utils.stripe import stripe_instance
from app.locales.translations import get_translation
from app.api.user.db_users import handle_purchase_credits
import logging
from fastapi.responses import JSONResponse

@transactional()
async def db_capture_payment(user_id: str, token: str,current_time, session: AsyncSession):

    subscription_result = await query_created_subscription(user_id=user_id,recharge_token=token)
    recharge_info = None
    if subscription_result and len(subscription_result) > 0:
        recharge_info = subscription_result[0]
    if not recharge_info:
        logging.warning(f"user_id: {user_id}, token: {token}, recharge info not found")
        return JSONResponse(content={
            "code": 1,
            "data": None,
            "msg": get_translation("subscription_info_not_found"),
        })
        
    stripe_id = recharge_info['recharge_remote_id']

    capture_result = stripe_instance.verify_subscription(stripe_id)
    if capture_result['result'] == 0:   
        logging.info(f"user_id: {user_id}, token: {token}, capture payment success")
        recharge_history_id = await update_recharge_history(
            user_id=user_id,
            token=token,
            recharge_extra=capture_result,
            recharge_status="completed",
            current_time=current_time,
        )
        
        # 只处理购买积分的逻辑
        # 购买积分：增加purchase_credits
        recharge_credits = recharge_info["recharge_credits"]
        await handle_purchase_credits(user_id, recharge_credits, current_time,recharge_history_id)
                
        logging.info(f"user_id: {user_id}, purchase_credits added: {recharge_credits}")

        return JSONResponse(content={
            "code": 0,
            "data": None,
            "msg": get_translation("purchase_success"),
        })
    else:
        await update_recharge_history(
            user_id=user_id,
            token=token,
            recharge_extra=capture_result,
            recharge_status="failed",
            current_time=current_time,
        )
        
        logging.info(f"user_id: {user_id}, token: {token}, capture payment failed, msg is: {capture_result['msg']}")
        return JSONResponse(content={
            "code": 1,
            "data": None,
            "msg": capture_result['msg'],
        })

@transactional()
async def update_recharge_history(user_id: str, token: str,recharge_status: str, current_time: datetime,recharge_extra, session: AsyncSession):
    """
    更新用户充值历史记录为指定状态
    """
    stmt_upd = (
        update(RechargeHistory)
        .where(RechargeHistory.user_id == user_id, RechargeHistory.recharge_token == token)
        .values(
            recharge_status=recharge_status,
            update_time=current_time,
            recharge_extra=recharge_extra
        ).returning(RechargeHistory.id)
    )
    result = await session.execute(stmt_upd)
    return result.scalar_one()

@transactional()
async def query_created_subscription(user_id: str,recharge_token: str, session: AsyncSession):
    """
    查询用户创建的订阅
    :param user_id: 用户ID
    :param recharge_token: 充值令牌
    :param session: 数据库会话
    :return: 如果订阅存在则返回True，否则返回False
    """
    stmt = select(RechargeHistory.id,RechargeHistory.recharge_time,RechargeHistory.recharge_type,RechargeHistory.recharge_amount,RechargeHistory.recharge_token,RechargeHistory.recharge_status,RechargeHistory.recharge_credits,RechargeHistory.recharge_membership_level,RechargeHistory.recharge_remote_id).where(RechargeHistory.user_id==user_id,RechargeHistory.recharge_token == recharge_token,RechargeHistory.recharge_status == "created")

    result = await session.execute(stmt)

    return [{"id": r[0],"recharge_time":r[1],"recharge_type":r[2],"recharge_amount":r[3],"recharge_token":r[4],"recharge_status":r[5],"recharge_credits":r[6],"recharge_membership_level":r[7],"recharge_remote_id":r[8]} for r in result.all()]

    
