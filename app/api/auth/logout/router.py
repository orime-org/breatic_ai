from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.utils.core import get_user_id
from app.locales.translations import get_translation
from app.common.redis_concurrency_client import redis_instance
from app.utils.core import get_token
from app.api.auth.db_account import update_account_fields
from datetime import datetime,timezone

logout_router = APIRouter()

@logout_router.get('/logout')
async def operator():
    user_id = get_user_id()
    if user_id is not None:
        token = get_token()
        updates = {
            "verify_token": "",
            "last_updated_at": datetime.now(timezone.utc)
        }
        await update_account_fields(filters={"user_id": user_id},updates=updates)
        if token:
            # 重置token相关信息
            await redis_instance.del_key(name=f"token:{token}")
            
    return JSONResponse(content={
        "code": 0,
        "data": {},
        "msg": get_translation("logout_success")
    })