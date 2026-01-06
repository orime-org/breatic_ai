from fastapi import APIRouter, Request,Query
import logging,os
from urllib.parse import quote
from fastapi.responses import JSONResponse
from app.utils.auth import auth_instance
from app.locales.translations import get_translation

login_router = APIRouter()

@login_router.get('/login')
async def operator(request: Request, redirect_uri: str = Query(...)):    
    # 获取当前请求的主机名
    host = request.headers.get("host", "")
    user_redirect = redirect_uri or "/"
            
    # 根据环境选择不同的重定向 URI
    if "localhost" in host or "127.0.0.1" in host: # 开发环境
        google_redirect_uri = "http://localhost:3000/api/auth/google/callback"
        user_redirect_uri =  "http://localhost:8080/login?redirect_uri=" + user_redirect
    else:
        base_google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        google_redirect_uri = base_google_redirect_uri + "/api/auth/google/callback"
        user_redirect_uri = base_google_redirect_uri + "/login?redirect_uri=" + user_redirect
                    
    logging.info(f"google_redirect_uri is : {google_redirect_uri}, user_redirect_uri is {user_redirect_uri}")
    
    state = quote(user_redirect_uri, safe="")# 用 state 携带原页面路径
    # 使用 OAuth 库重定向到 Google 登录页面
    return await auth_instance.oauth.google.authorize_redirect(
        request,
        google_redirect_uri,
        state=state  
    )
    