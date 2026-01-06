from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.utils.core import get_user_id
from app.data.membership import get_membership_benefit_item
from datetime import timezone
from app.api.user.db_users import find_one as find_user_by_id,calculate_user_credits
from app.api.auth.db_account import find_one_by_user_id
from app.api.auth.model.accounts import Account

info_router = APIRouter()

@info_router.get('/info')
async def operator():
    user_id = get_user_id()
    user = await find_user_by_id(user_id)
       
    membership_level = user.membership_level or 0
    membership_items = get_membership_benefit_item()
    
    default_name = membership_items[0].get("name")
    planName = membership_items[membership_level].get("name", default_name)
    
    #获取当前可用积分
    credits = await calculate_user_credits(user_id)
    account: Account = await find_one_by_user_id(user_id)

    #获取会员过期时间
    if membership_level > 0:
        # 处理时间格式
        if user.membership_expires_at:
            membership_expires_at = user.membership_expires_at
        else:
            membership_expires_at = ""
        if membership_expires_at.tzinfo is None:
            membership_expires_at = membership_expires_at.replace(tzinfo=timezone.utc)
        membership_expires_at_str = membership_expires_at.strftime("%Y-%m-%dT%H:%M:%SZ")
        plan_expiry_time = membership_expires_at_str
    else:
        plan_expiry_time = ""
    
    response_data = {
        "name": user.nickname or "",
        "email": account.email or "",
        "avatar": user.avatar or "",
        "planId": membership_level,
        "planName": planName,
        "planExpiryTime": plan_expiry_time,
        "credits": credits,
    }
    
    return JSONResponse(content={
        "code": 0,
        "data": response_data,
        "msg": "",
    })