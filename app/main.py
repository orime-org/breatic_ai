import sys
import os
import time
import asyncio

from fastapi import Request
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Response 
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import logging,os,sys

import httpx
from app.utils.core import is_running_in_docker,is_running_in_prod
from init_env import initialize_environment_variables
from redis.asyncio import Redis
from contextlib import asynccontextmanager
from app.common.redis_concurrency_client import redis_instance
from app.common.httpx_client import httpx_client

import uvicorn

# 初始化环境变量
initialize_environment_variables()

# 是否为开发环境
#  'dev'
# is_dev = os.getenv('ENV') == 'dev'
# is_dev = is_running_in_prod()

# 日志处理
from app.utils.log import register_log_handlers
register_log_handlers()

def _redis_url() -> str:
    host = "redis" if is_running_in_docker() else os.getenv("REDIS_HOST")
    port = int(os.getenv("REDIS_PORT"))
    db   = int(os.getenv("REDIS_DB"))
    pwd  = os.getenv("REDIS_PASSWORD") or ""
    auth = f":{pwd}@" if pwd else ""
    return f"redis://{auth}{host}:{port}/{db}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = Redis.from_url(
        _redis_url(),
        encoding="utf-8",
        decode_responses=True,
        health_check_interval=30,
        retry_on_timeout=True,
        socket_connect_timeout=5,
        socket_timeout=5,
    )
    # 启动期健康检查（带有限重试）
    for i in range(3):
        try:
            await app.state.redis.ping()
            break
        except Exception:
            if i == 2:
                raise
            await asyncio.sleep(0.5 * (2 ** i))
    
    app.state.http = httpx.AsyncClient(
        http2=True,
        verify=False,
        timeout=httpx.Timeout(connect=20, read=500, write=500, pool=10),
        limits=httpx.Limits(max_connections=128, max_keepalive_connections=64, keepalive_expiry=15),
        follow_redirects=True,
        trust_env=False,
    )

    httpx_client.bind_http_getter(lambda: app.state.http)
    redis_instance.bind_redis_getter(lambda: app.state.redis)

    try:
        yield
    finally:
        await redis_instance.aclose()      # 先停用到这些资源的后台任务
        await app.state.http.aclose()


#定义fastapi
fast_app = FastAPI(lifespan=lifespan)

# 配置 CORS
fast_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]  # 添加这一行
)
# , "dev-secret-key"
# 添加 SessionMiddleware，使用一个安全的随机密钥
fast_app.add_middleware(SessionMiddleware, os.getenv("SESSION_SECRET_KEY")) #secret_key=secrets.token_urlsafe(32)

# 错误处理
from app.utils.exception import register_exception_handlers
register_exception_handlers(fast_app)

# 全局钩子函数
from app.utils.hook import register_hook_handlers
# from app.utils.ws_auth_hook import register_ws_hook_handlers

register_hook_handlers(fast_app)
# register_ws_hook_handlers(fast_app)

# 在FastAPI中添加中间件监控响应时间
@fast_app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

#注册auth
from app.utils.auth import auth_instance
auth_instance.register_google_auth()

#注册支付
from app.utils.stripe import stripe_instance
stripe_instance.register_stripe()

# api接口
from app.api.router import api_router
fast_app.include_router(api_router)

# 记录日志
logging.info("System Start Successfully")


if __name__ == "__main__":
    uvicorn.run("main:fast_app", host="0.0.0.0", port=3000, reload=False)