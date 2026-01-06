from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from app.locales.translations import get_translation
from app.utils.core import is_running_in_prod
from app.api.auth.model.accounts import Account
from app.api.auth.db_account import find_one_by_email as db_find_one_by_email,create_user_with_transac as db_create_user,update_users_fields,update_account_fields
from app.api.user.db_users import find_one as db_find_one
from app.utils.id_generator import generate_id
from app.utils.time_utils import get_current_time,compare_time
from app.common.redis_concurrency_client import redis_instance

# 请求模型
class EmailLoginRequest(BaseModel):
    email: EmailStr
    code: str

login_router = APIRouter()

@login_router.post('/login')
async def operator(request: EmailLoginRequest):
    # 查询账号信息
    account: Account = await db_find_one_by_email(email=request.email)
    if not account:
            return JSONResponse(content={
                "code": 400,
                "data": {},
                "msg": get_translation("email_not_exist")
    })
    if is_running_in_prod():
        # 验证码长度检查
        if len(request.code) != 6:
            return JSONResponse(content={
                "code": 400,
                "data": {},
                "msg": get_translation("verification_code_must_be_6_digits")
            })
    
        # 检查验证码是否匹配
        if str(account.verification_code) != request.code:
            return JSONResponse(content={
                "code": 400,
                "data": {},
                "msg": get_translation("verification_code_error")
            })
        
    
    utc_now, beijing_formatted_time, utc_delta = get_current_time(7200)
        
    # 检查验证码是否过期
    if compare_time(utc_now, account.code_expires_at or 0):
        return JSONResponse(content={
            "code": 400,
            "data": {},
            "msg": get_translation("verification_code_expired")
        })
    
   
    token = account.verify_token
    # 验证通过，生成新token
    new_token = generate_id()
    
    user_id = account.user_id
        
    # 获取用户信息
    user = await db_find_one(id=user_id)
    
    if not user:
        await db_create_user(user_id, request.email.split('@')[0], "", utc_now, beijing_formatted_time)
    else:
        # 更新用户最后登录时间
        await update_users_fields(
            filters={"id": user_id},
            updates={
                "last_login_at": utc_now,
                "last_updated_at": utc_now,
            }
        )

    
    updates = {
        "verify_token": new_token,
        "last_updated_at": utc_now
    }
    await update_account_fields(filters={"user_id": account.user_id},updates=updates)
    if token:
        await redis_instance.del_key(name=f"token:{token}")
    await redis_instance.set_key(name=f"token:{new_token}",value=user_id,ttl_ms=30*24*60*60*1000)
    
    return JSONResponse(content={
        "code": 0,
        "data": {
            "accessToken": new_token
        },
        "msg": get_translation("login_success")
    })

