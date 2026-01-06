from fastapi import APIRouter,Body
from fastapi.responses import JSONResponse
from app.utils.stripe import stripe_instance
from app.utils.core import get_user_id
import logging
from app.data.credit import get_credit_items
from app.locales.translations import get_translation
from app.api.user.db_users import find_one as db_user_find_one
from app.api.user.model.users import User
from app.api.transaction.model.recharge_history import RechargeHistory
from app.api.stripe.create_payment.db import insert_recharge_history
from decimal import Decimal
from decimal import ROUND_HALF_UP
from app.utils.id_generator import generate_id
from app.utils.time_utils import get_current_time

create_payment_router = APIRouter()


@create_payment_router.post('/create_payment')
async def operator(
    itemId: int = Body(...),
    amount: int = Body(...),
    returnUrl: str = Body(...),
    cancelUrl: str = Body(...)
):
    user_id = get_user_id()

    user:User = await db_user_find_one(id=user_id)
    # 从数据库查询用户信息
    # user = await mongo_instance.find_one("users", {"_id": user.id})
    is_first_recharge = user.is_first_recharge
    
    
    #根据ID查询 item
    items = get_credit_items()
    
    # 从items中找到id为itemId的item
    item = next((item for item in items if item.get('id') == itemId), None)
    
    # 如果没有找到对应的item，返回错误
    if item is None:
        return JSONResponse(content={
            "code": 1,
            "data": None,
            "msg": get_translation("invalid_credit_item_id"),
        })
        
    if not is_first_recharge:
        item_is_first_recharge = item["isFirstRecharge"]
        if item_is_first_recharge:
            return JSONResponse(content={
                "code": 1,
                "data": None,
                "msg": get_translation("payment_creation_failed")
            })
            
        
    item_code = item["code"]
    purchase_credits = item["addonValue"]
    item_price = item["price"]
    
    #生成一个客户端自己的ID
    client_reference_id = generate_id()
            
    create_result = stripe_instance.create_payment(
        client_reference_id = client_reference_id,
        item_code=item_code,
        success_url=f"{returnUrl}?credits_result=success&token={client_reference_id}",
        cancel_url=f"{cancelUrl}?credits_result=cancel&token={client_reference_id}"
    )
    
    if create_result['result'] == 0:
        approval_url = create_result['url']
            
        #这里需要获取到token,然后保存到数据库
        token = client_reference_id
        
        #这里需要将交易信息插入到用户的user_transactions集合的recharge_history，状态为created
        current_time, _, _ =  get_current_time()
        
        recharge_history = RechargeHistory()
        recharge_history.user_id=user_id
        recharge_history.recharge_time=current_time
        recharge_history.recharge_type="purchase_credits"
        recharge_history.recharge_channel="stripe"
        recharge_history.recharge_remote_id=create_result['id']
        recharge_history.recharge_amount=Decimal(str(item_price)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        recharge_history.recharge_item_id=str(itemId)
        recharge_history.recharge_credits=purchase_credits
        recharge_history.recharge_token=token
        recharge_history.recharge_status="created"

        await insert_recharge_history(recharge_history=recharge_history)
        
        logging.info(f"user_id: {user.id}, create payment success, approval_url: {approval_url}")
        
        return JSONResponse(content={
            "code": 0,
            "data": {"approval_url":approval_url},
            "msg": "create payment success",
        })
    else:
        return JSONResponse(content={
            "code": 1,
            "data": None,
            "msg": create_result['msg'],
        })
