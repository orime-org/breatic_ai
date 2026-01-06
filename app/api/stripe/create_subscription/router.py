from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from app.utils.stripe import stripe_instance
from app.utils.core import get_user_id
from app.utils.time_utils import get_current_time

from app.data.membership import get_membership_benefit_item
from app.locales.translations import get_translation
import logging
from app.api.user.db_users import find_one as db_user_find_one
from app.api.transaction.model.recharge_history import RechargeHistory
from app.api.stripe.create_subscription.db import insert_recharge_history
from decimal import Decimal
from decimal import ROUND_HALF_UP
from app.utils.id_generator import generate_id
# 叶子节点的blueprint不加url_prefix
create_subscription_router = APIRouter()

@create_subscription_router.post('/create_subscription')
async def operator(
    planId: int = Body(...),
    returnUrl: str = Body(...),
    cancelUrl: str = Body(...)
):
    user_id = get_user_id()
    
    # 从数据库查询用户信息
    user = await db_user_find_one(id=user_id)
    
    membership_level = user.membership_level
    
    if membership_level > 0:
        return JSONResponse(content={
            "code": 1,
            "data": None,
            "msg": get_translation("is_already_membership"),
        })
    
    # 获取会员计划信息以确定订阅金额
    membership_items = get_membership_benefit_item()
    plan_info = None
    for item in membership_items:
        if item.get('id', 0) == planId:
            plan_info = item
            break
    
    if not plan_info:
        logging.error(f"Plan {planId} not found")
        
        return JSONResponse(content={
            "code": 1,
            "data": None,
            "msg": get_translation("invalid_plan_id"),
        })
        
    item_code = item["code"]
        
    #生成一个客户端自己的ID
    client_reference_id = generate_id()
    
    create_result = stripe_instance.create_subscription(
        client_reference_id=client_reference_id,
        item_code=item_code,
        success_url=f"{returnUrl}?subscription_result=success&token={client_reference_id}",
        cancel_url=f"{cancelUrl}?subscription_result=cancel&token={client_reference_id}"
    )
    
    if create_result['result'] == 0:
        approval_url = create_result['url']
        subscription_id = create_result['id']  # 直接从返回结果获取
        token = client_reference_id
        
        current_time, _, _ = get_current_time()
        await insert_recharge_history(
            recharge_history=RechargeHistory(
                user_id=user_id,
                recharge_time=current_time,
                recharge_type="membership_subscription",
                recharge_channel="stripe",
                recharge_remote_id=create_result['id'],
                recharge_amount=Decimal(str(plan_info.get('price', 0))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                recharge_item_id=str(planId),
                recharge_membership_level=int(planId),
                recharge_token=token,
                recharge_status="created"
            ),
        )
        
        logging.info(f"User {user_id} created subscription ID {subscription_id} with approval_url {approval_url}")
        
        return JSONResponse(content={
            "code": 0,
            "data": {
                "approval_url": approval_url
            },
            "msg": get_translation("create_subscription_success"),
        })
    else:
        logging.error(f"User {user_id} subscription creation failed: {create_result.get('msg', 'Unknown error')}")
        return JSONResponse(content={
            "code": 1,
            "data": None,
            "msg": create_result.get('msg', get_translation("subscription_creation_failed")),
        })