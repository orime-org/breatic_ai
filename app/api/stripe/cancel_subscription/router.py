from fastapi import APIRouter,Body
from fastapi.responses import JSONResponse
from app.utils.core import get_user_id
import logging
from app.utils.time_utils import get_current_time

from app.api.stripe.cancel_subscription.db import update_recharge_history as db_update_recharge_history

cancel_subscription_router = APIRouter()

@cancel_subscription_router.post('/cancel_subscription')
async def operator(
    token: str = Body(..., embed=True)
):
    user_id = get_user_id()
    
    #查询数据，将订单修改为取消状态
    current_time, _, _ = get_current_time()
    await db_update_recharge_history(user_id=user_id,token=token,recharge_status="canceled",current_time=current_time)
    
    logging.info(f"user_id: {user_id}, cancel subscription success, token: {token}")
    
    return JSONResponse(content={
        "code": 0,
        "data": None,
        "msg": "cancel subscription success",
    })
