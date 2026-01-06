from fastapi import APIRouter, HTTPException, Request, status
import logging
from app.utils.stripe import stripe_instance
from pydantic import BaseModel
from app.api.user.db_users import handle_subscription_renewal
from app.utils.time_utils import get_current_time

class SubscriptionData(BaseModel):
    id: str
    customer: str
    status: str  # 用于过滤续订事件

webhook_router = APIRouter()

@webhook_router.post('/webhook')
async def operator(request: Request):
    """
    处理 Stripe Webhook 请求，包括签名验证和事件处理。
    """
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        # 验证签名确保请求来自 Stripe
        verify_result = stripe_instance.verify_webhook_signature(payload,sig_header)
        
        if verify_result['result'] != 0:
            logging.error("Webhook signature verification failed")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")
        
        event = verify_result['event']

        # 仅处理订阅相关事件
        if event.type == "customer.subscription.updated":
            subscription = SubscriptionData(**event["data"]["object"])
            if subscription.status == "active":  
                current_time, _, _ = get_current_time()
                # 续订成功逻辑（需检查是否是新周期）
                await handle_subscription_renewal(current_time,subscription)
        elif event.type == "customer.subscription.deleted":
            subscription = SubscriptionData(**event["data"]["object"])

        return {"status": "success"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Handle Webhook error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")