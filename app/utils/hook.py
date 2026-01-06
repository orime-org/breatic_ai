from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
from .core import request_context
import logging
from app.api.user.db_users import find_one as db_find_one_user,update_user_benefits
from app.common.redis_concurrency_client import redis_instance
from app.utils.core import is_login_model

class HookMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 设置请求上下文
        context_marker = request_context.set(request) # type: ignore
        
        try:
            # 从请求头或查询参数中获取语言设置
            language = request.headers.get('Accept-Language') or request.query_params.get('lang', 'en-US')
            
            # 简单的语言代码处理
            if language.startswith('en'):
                request.state.language = 'en'
            elif language.startswith('zh-TW') or language.startswith('zh-HK'):
                request.state.language = 'tw'
            elif language.startswith('ja'):
                request.state.language = 'ja'
            else:
                request.state.language = 'cn'
                
            # 初始化用户信息
            request.state.user_id = None
            
           
            request.state.user_ip = request.headers.get('X-Real-IP', None)  
            if not is_login_model():
                user_id = "1"
                request.state.user_id = user_id
                user = await db_find_one_user(id=request.state.user_id)
                if not user:
                    raise HTTPException(status_code=401, detail=f"User {request.state.user_id} does not exist")
                response = await call_next(request)
                return response

            # 从Nginx传递的真实IP
            # 检查请求头中是否包含Authorization
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                
                if len(token) > 0:
                    user_id = await redis_instance.get_key_ex(name=f"token:{token}",ttl_ms=30*24*60*60*1000)

                    if user_id:
                        # 设置用户认证信息
                        request.state.user_id = user_id
                        request.state.token = token
                        #统一查询用户信息是否存在
                        user = await db_find_one_user(id=request.state.user_id)
                        if not user:
                            raise HTTPException(status_code=401, detail=f"User {request.state.user_id} does not exist")
                        else:
                            redis_token, fence = await redis_instance.lock_acquire(f"user:{user_id}")
                            try:
                                await update_user_benefits(request.state.user_id)
                            finally:
                                await redis_instance.lock_release(f"user:{user_id}",redis_token)

            response =  await call_next(request)
            return response
        
        except HTTPException as e:
            # 返回友好的错误响应，而不是让异常传播
            logging.critical(f"HookMiddleware HTTPException error, str{e}",exc_info=True)
            return JSONResponse(
                status_code=e.status_code,
                content={"error": e.detail}
            )
            
        except Exception as e:
            # 返回友好的错误响应，而不是让异常传播
            logging.critical(f"HookMiddleware Exception error, str{e}",exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"}
            )
        
        finally:
            # 清理请求上下文
            request_context.reset(context_marker)
         
def register_hook_handlers(fast_app: FastAPI):
    fast_app.add_middleware(HookMiddleware)