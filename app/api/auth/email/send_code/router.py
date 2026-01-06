import random
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from app.locales.translations import get_translation
import logging
from app.api.auth.model.accounts import Account
from app.utils.id_generator import generate_id
from app.utils.email_sender import send_user_login_sign_number
from app.api.auth.db_account import find_one_by_email as db_find_one_by_email,create as db_create_account,update_account_fields
from app.utils.time_utils import get_current_time

# 请求模型
class EmailRequest(BaseModel):
    email: EmailStr

send_code_router = APIRouter()

@send_code_router.post('/send_code')
async def operator(request: EmailRequest):
    # 生成六位数字验证码和token，写入账号表
    verification_code = str(random.randint(100000, 999999))
    
    #验证码5分钟过期，为300秒
    utc_now, beijing_formatted_time, utc_delta = get_current_time(300)
   
    # 检查账号表是否已经注册，如果没有注册 则先注册
    account: Account = await db_find_one_by_email(email=request.email)

    if not account:
        # 如果账号不存在，则创建新账号
        account = Account()
        # 创建新账号ID
        account.id = generate_id()
        # 创建新用户ID
        user_id = generate_id()
        account.user_id = user_id
        account.email = request.email
        account.status = "active"
        account.account_type = "email"
        account.verification_code = verification_code
        account.code_created_at = utc_now
        account.code_expires_at = utc_delta
        account.last_updated_at = utc_now
        account.created_at = utc_now
      
        account.created_at_str = beijing_formatted_time
        await db_create_account(account)
       
            
    else:
       
        updates = {
            "verification_code": verification_code,
            "code_created_at": utc_now,
            "code_expires_at": utc_delta,
            "last_updated_at": utc_now
        }
        await update_account_fields(filters={"user_id": account.user_id},updates=updates)

    # 通过邮箱发送，根据发送结果给出信息
    send_result = await send_user_login_sign_number(request.email, verification_code)

    if send_result.get('state',1) == 0:
        return JSONResponse(content={
            "code": 0,
            "data": {},
            "msg": get_translation("verification_code_sent_to_your_email")
        })
    else:
        logging.error(f"Failed to send verification code to {request.email}: {send_result}")
        return JSONResponse(content={
                "code": 500,
                "data": {},
                "msg": get_translation("verification_code_sent_failed")
            })

 