from fastapi import APIRouter, Body
from app.utils.core import get_user_id
from app.utils.time_utils import get_current_time
from app.api.stripe.verify_subscription.db import db_verify_subscription
from app.common.redis_concurrency_client import redis_instance

verify_subscription_router = APIRouter()

@verify_subscription_router.post('/verify_subscription')
async def operator(
    token: str = Body(..., embed=True)
):
    user_id = get_user_id()
    current_time, _, _ = get_current_time()
    redis_token, fence = await redis_instance.lock_acquire(f"user:{user_id}")
    try:
        return await db_verify_subscription(user_id=user_id, token=token,current_time=current_time)
    finally:
        await redis_instance.lock_release(f"user:{user_id}",redis_token)

        
