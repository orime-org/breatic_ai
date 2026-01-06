from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from app.utils.core import get_user_id
from app.locales.translations import get_translation
import logging
import math
from datetime import datetime, timezone
from app.api.transaction.credits_record.db import get_user_credits_record


#叶子节点的blueprint不加url_prefix
credits_record_router = APIRouter()

@credits_record_router.get('/credits_record')
async def operator():
    # 获取当前用户ID
    user_id = get_user_id()
        
    records = await get_user_credits_record(user_id)
    
    return JSONResponse(content={
        "code": 0,
        "data": {
            "totalCredits": records.get("total_credits", 0),
            "freeCredits": records.get("free_credits", 0),
            "membershipCredits": records.get("membership_credits", 0),
            "purchaseCredits": records.get("purchase_credits", 0),
            },
        "msg": ""
    })