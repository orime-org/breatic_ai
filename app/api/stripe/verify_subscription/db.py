from app.api.transaction.model.recharge_history import RechargeHistory
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,func,update
from app.common.transactional import transactional
from datetime import datetime
from app.utils.stripe import stripe_instance
from app.data.membership import get_membership_benefit_item
from app.locales.translations import get_translation
from app.api.user.db_users import handle_subscribe_membership
import logging
from fastapi.responses import JSONResponse

@transactional()
async def db_verify_subscription(user_id: str, token: str,current_time, session: AsyncSession):
    # 使用聚合查询直接获取匹配的recharge记录（订阅类型）
    subscription_result = await query_created_subscription(user_id=user_id,recharge_token=token)
    subscription_info = None
    if subscription_result and len(subscription_result) > 0:
        subscription_info = subscription_result[0]
    
    
    if not subscription_info:
        logging.warning(f"user_id: {user_id}, token: {token}, subscription info not found")
        return JSONResponse(content={
            "code": 1,
            "data": None,
            "msg": get_translation("subscription_info_not_found"),
        })
        
    stripe_id = subscription_info['recharge_remote_id']
    
    verify_result = stripe_instance.verify_subscription(stripe_id)
        
    if verify_result['result'] == 0:
        logging.info(f"user_id: {user_id}, token: {token}, verify subscription success")
                                  
        # 更新recharge_history状态为completed
        recharge_history_id =await update_recharge_history(
            user_id=user_id,
            token=token,
            recharge_extra=verify_result,
            recharge_status="subscribed",
            current_time=current_time,
        )
        # 获取会员计划信息
        # membership_level = subscription_info.get('recharge_membership_level', 0)
        membership_level = subscription_info['recharge_membership_level']
        membership_items = get_membership_benefit_item()
        
        # 查找对应的会员计划
        plan_info = None
        for item in membership_items:
            if item.get('id', 0) == membership_level:
                plan_info = item
                break
        
        if plan_info:
            expire_time = await handle_subscribe_membership(user_id, membership_level,stripe_id,current_time=current_time,recharge_history_id=recharge_history_id   )            
            logging.info(f"user_id: {user_id}, membership updated: level {membership_level}, expire_time: {expire_time}")
            
            return JSONResponse(content={
                "code": 0,
                "data": None,
                "msg": get_translation("subscription_success"),
            })
        else:
            logging.error(f"Membership plan {membership_level} not found")
            return JSONResponse(content={
                "code": 1,
                "data": None,
                "msg": get_translation("invalid_membership_plan"),
            })
    else:
        await update_recharge_history(
            user_id=user_id,
            token=token,
            recharge_extra=verify_result,
            recharge_status="failed",
            current_time=current_time,
        )
        logging.info(f"user_id: {user_id}, token: {token}, verify subscription failed")
        return JSONResponse(content={
            "code": 1,
            "data": None,
            "msg": get_translation("subscription_verification_failed"),
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
            recharge_extra=recharge_extra,
            update_time=current_time,
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
