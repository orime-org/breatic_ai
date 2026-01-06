import httpx,os,logging
import asyncio
from app.locales.translations import get_translation
from app.utils.core import is_running_in_prod
import stripe

class Stripe:
    """
    https://dashboard.stripe.com/dashboard
    支付类，使用 Stripe Checkout
    
    测试卡号
    付款成功 4242 4242 4242 4242
    付款需要验证 4000 0025 0000 3155
    付款被拒绝 4000 0000 0000 9995
    
    """
    
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        # 配置 PayPal SDK
        self.running_in_prod = is_running_in_prod()
        
        if self.running_in_prod:
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
            self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
            
            #这里对应 data/credits.py
            self.credit_item_id_to_price_id = {
                "credit_items_0":os.getenv("CREDIT_ITEMS_0",""), 
                "credit_items_1":os.getenv("CREDIT_ITEMS_1",""), 
                "credit_items_2":os.getenv("CREDIT_ITEMS_2",""), 
                "credit_items_3":os.getenv("CREDIT_ITEMS_3",""), 
                "credit_items_4":os.getenv("CREDIT_ITEMS_4",""), 
                "credit_items_5":os.getenv("CREDIT_ITEMS_5",""), 
            }
            
            # 这里对应 data/membership.py
            self.membership_item_id_to_price_id = {
                "membership_items_1":os.getenv("MEMBERSHIP_ITEMS_1",""), 
                "membership_items_2":os.getenv("MEMBERSHIP_ITEMS_2",""), 
                "membership_items_4":os.getenv("MEMBERSHIP_ITEMS_4",""), 
                "membership_items_5":os.getenv("MEMBERSHIP_ITEMS_5",""),
            }
            
        else:
            stripe.api_key = os.getenv("STRIPE_SANDBOX_SECRET_KEY")
            
            # print(f"api_key is {stripe.api_key}")
            
            #这里对应 data/credits.py
            self.credit_item_id_to_price_id = {
                "credit_items_0":os.getenv("SANDBOX_CREDIT_ITEMS_0",""), 
                "credit_items_1":os.getenv("SANDBOX_CREDIT_ITEMS_1",""), 
                "credit_items_2":os.getenv("SANDBOX_CREDIT_ITEMS_2",""), 
                "credit_items_3":os.getenv("SANDBOX_CREDIT_ITEMS_3",""), 
                "credit_items_4":os.getenv("SANDBOX_CREDIT_ITEMS_4",""), 
                "credit_items_5":os.getenv("SANDBOX_CREDIT_ITEMS_5",""), 
            }
            
            # 这里对应 data/membership.py
            self.membership_item_id_to_price_id = {
                "membership_items_1":os.getenv("SANDBOX_MEMBERSHIP_ITEMS_1",""), 
                "membership_items_2":os.getenv("SANDBOX_MEMBERSHIP_ITEMS_2",""), 
                "membership_items_4":os.getenv("SANDBOX_MEMBERSHIP_ITEMS_4",""), 
                "membership_items_5":os.getenv("SANDBOX_MEMBERSHIP_ITEMS_5",""),
            }
                         
    def register_stripe(self):
        """
        注册 Stripe
        """            
        logging.info("Stripe Register Successfully")
        
    def create_payment(self, client_reference_id:str, item_code: str, success_url: str, cancel_url: str) -> dict:
        """
        创建积分购买支付
        result 为0 表明成功，result 为1 表明失败，msg说明失败情况
        """
        
        price_id = self.credit_item_id_to_price_id.get(item_code, "")
        
        if not price_id:
            logging.error(f"Payment creation failed： can not find price_id for item : {item_code}")
            return {"result": 1, "msg": get_translation("payment_creation_failed")}
        
        try:
            checkout_session = stripe.checkout.Session.create(
                client_reference_id=client_reference_id,
                # currency="usd",
                line_items=[
                    {
                        # Provide the exact Price ID (for example, price_1234) of the product you want to sell
                        'price': price_id,
                        'quantity': 1,
                    },
                ],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                automatic_tax={'enabled': True},
            )
                        
            return {"result": 0, "id":checkout_session.id, "url": checkout_session.url}

        except Exception as e:
            logging.error(f"Payment creation failed: {str(e)}", exc_info=True)
            return {"result": 1, "msg": get_translation("payment_creation_failed")}
        
    def capture_payment(self, stripe_id: str) -> dict:
        """
        捕获积分购买支付
        result 为0 表明成功，result 为1 表明失败，msg说明失败情况
        """        
        try:
            checkout_session = stripe.checkout.Session.retrieve(stripe_id)
            
            payment_status = checkout_session['payment_status']
                                        
            if payment_status == "paid":
                return {"result": 0, "checkout_session":checkout_session}
            else:
                logging.info(f"payment_capture_failed: {str(e)}")
                return {"result": 1, "msg": get_translation("payment_capture_failed")}
                
        except Exception as e:
            logging.error(f"Payment capture failed: {str(e)}", exc_info=True)
            return {"result": 1, "msg": get_translation("payment_capture_failed")}

    def create_subscription(self, client_reference_id:str, item_code: str, success_url: str, cancel_url: str) -> dict:
        """
        创建订阅
        """
        
        price_id = self.membership_item_id_to_price_id.get(item_code, "")
        
        if not price_id:
            logging.error(f"Subscription creation failed： can not find price_id for item : {item_code}")
            return {"result": 1, "msg": get_translation("subscription_creation_failed")}
        
        try:
            checkout_session = stripe.checkout.Session.create(
                client_reference_id=client_reference_id,
                line_items=[
                    {
                        # Provide the exact Price ID (for example, price_1234) of the product you want to sell
                        'price': price_id,
                        'quantity': 1,
                    },
                ],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                automatic_tax={'enabled': True},
            )
                        
            return {"result": 0, "id":checkout_session.id, "url": checkout_session.url}
        except Exception as e:
            logging.error(f"Subscription creation failed: {str(e)}", exc_info=True)
            return {"result": 1, "msg": get_translation("subscription_creation_failed")}

    def verify_subscription(self, stripe_id: str) -> dict:
        """
        验证订阅状态
        """
        try:
            checkout_session = stripe.checkout.Session.retrieve(stripe_id)
            
            payment_status = checkout_session['payment_status']             
            if payment_status == "paid":
                return {"result": 0, "checkout_session":checkout_session}
            else:
                return {"result": 1, "msg": get_translation("subscription_verification_failed")}
            
        except Exception as e:
            logging.error(f"Subscription verification failed: {str(e)}", exc_info=True)
            return {"result": 1, "msg": get_translation("subscription_verification_failed")}
        
    def verify_webhook_signature(self, payload, sig_header) -> bool:
        """
        验证 Stripe Webhook 签名
        """
        
        if not self.webhook_secret:
            logging.error(f"Stripe Webhook ID not found.  self.running_in_prod: {self.running_in_prod} Please check your configuration.")
            return False
        
        try:
            # 验证签名确保请求来自 Stripe
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            
            return {"result":0, "event":event}
                  
        except Exception as e:
            logging.error(f"Webhook verify signature failed: {str(e)}")
            return {"result":1}
        
# 创建单例实例
stripe_instance = Stripe()