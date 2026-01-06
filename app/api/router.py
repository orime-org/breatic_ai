from fastapi import APIRouter

# 创建主路由
api_router = APIRouter(prefix='/api')

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# 导入并包含所有子路由
from .auth.router import auth_router
from .plan.router import plan_router
from .transaction.router import transaction_router
from .user.router import user_router
from .stripe.router import stripe_router
from .workflow.router import workflow_router
from .ws.router import ws_router
# 注册所有子路由
api_router.include_router(auth_router)
api_router.include_router(plan_router)
api_router.include_router(transaction_router)
api_router.include_router(user_router)
api_router.include_router(stripe_router)
api_router.include_router(workflow_router)
api_router.include_router(ws_router)
