from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from app.utils.auth import auth_instance
import logging
from urllib.parse import unquote
from app.api.auth.db_account import google_login as db_login

callback_router = APIRouter()

@callback_router.get('/callback')
async def operator(request: Request):    
    # 获取原始页面路径（来自 state）
    raw_state = request.query_params.get("state", "/")
    redirect_url = unquote(raw_state)
     
    try:    
        # 获取 OAuth 令牌
        google_token = await auth_instance.oauth.google.authorize_access_token(request)
    except Exception as e:
        logging.error(f"authorize_access_token Error: {e}")
        # 拼接并重定向到前端 + 失败信息
        final_url = f"{redirect_url}&access_token=google_login_fail"
        return RedirectResponse(final_url)
    
    # 解析 ID 令牌获取用户信息
    user_info = google_token.get('userinfo')
    if not user_info:
        try:
            # 如果 userinfo 不存在，尝试解析 id_token
            user_info = await auth_instance.oauth.google.parse_id_token(request, google_token)
        except Exception as e:
            logging.error(f"Error parsing id_token: {e}")
            # 拼接并重定向到前端 + 失败信息
            final_url = f"{redirect_url}&access_token=google_login_fail"
            return RedirectResponse(final_url)
            
    # 获取用户基本信息
    user_email = user_info.get('email')
    user_name = user_info.get('given_name') if user_info.get('given_name', '') else user_info.get('family_name')
    avatar = user_info.get('picture')
    
    if not user_email:
        logging.error("No email found in Google user info")
        final_url = f"{redirect_url}&access_token=google_login_fail"
        return final_url
    
    token = await db_login(user_email=user_email,user_name=user_name,avatar=avatar)
    final_url = f"{redirect_url}&access_token={token}"
    return RedirectResponse(final_url)