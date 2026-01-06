from fastapi import APIRouter, Body
from app.utils.core import get_user_id
from app.api.stripe.capture_payment.db import db_capture_payment
from app.utils.time_utils import get_current_time
from app.common.redis_concurrency_client import redis_instance

capture_payment_router = APIRouter()

@capture_payment_router.post('/capture_payment')
async def operator(token: str = Body(..., embed=True)):
    user_id = get_user_id()
    current_time, _, _ = get_current_time()
    redis_token, fence = await redis_instance.lock_acquire(f"user:{user_id}")
    try:
        return await db_capture_payment(user_id=user_id, token=token,current_time=current_time)
    finally:
        await redis_instance.lock_release(f"user:{user_id}",redis_token)