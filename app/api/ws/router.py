from fastapi import APIRouter, Body, WebSocket
from starlette.websockets import WebSocketDisconnect, WebSocketState
from app.utils.core import get_user_id
from app.api.workflow.base.db import save as db_save
from app.api.workflow.pydantic_model.workflow_pydantic import WorkflowUpdate,WorkflowUpdateRequest
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.common.redis_concurrency_client import redis_instance 
import asyncio, contextlib
from app.api.workflow.utils.workflow_conn_manager import manager 
from urllib.parse import parse_qs
from starlette.types import Scope, Send
from app.api.user.db_users import find_one as db_find_one_user
from app.common.redis_concurrency_client import redis_instance
from app.utils.core import is_login_model
from pydantic import ValidationError

ws_router = APIRouter(
    prefix='/ws',
    tags=['ws']
)

async def ws_verity_token(scope: Scope):
    
    headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
    qs = parse_qs((scope.get("query_string") or b"").decode())

    lang = headers.get("accept-language") or (qs.get("lang") or ["en-US"])[0]
    if lang.startswith("en"):
        scope["language"] = "en"
    elif lang.startswith("zh-tw") or lang.startswith("zh-hk"):
        scope["language"] = "tw"
    elif lang.startswith("ja"):
        scope["language"] = "ja"
    else:
        scope["language"] = "cn"

    # IP（如用反代，建议再配 ProxyHeadersMiddleware 或 uvicorn --proxy-headers）
    scope["user_ip"] = headers.get("x-real-ip")
    scope["user_id"] = None

    # 取 token：先 Authorization: Bearer，再 query ?token=，再子协议
    token = None
    auth = headers.get("authorization")
    if auth and auth.startswith("bearer "):
        token = auth[7:].strip()
    if not token:
        token = (qs.get("token") or [None])[0]
    if not token:
        subproto = headers.get("sec-websocket-protocol")
        if subproto:
            token = subproto.split(",")[0].strip()
    
    update_token = (qs.get("update_token") or [None])[0]
    workflow_id = (qs.get("workflow_id") or [None])[0]

    if not workflow_id:
        return {"type": "websocket.close", "code": 1008}
    
    if not is_login_model():
        user_id = "1"
        scope["user_id"] = user_id
        user = await db_find_one_user(id=user_id)
        if not user:
            return {"type": "websocket.close", "code": 1008}
       
        token_verify = await manager.token_verify(key=workflow_id + "_" + user_id,update_token=update_token) 
        if not token_verify:
            return {"type": "websocket.close", "code": 1008}

        return {"code": 0}

    # 没 token：直接拒绝握手（未 accept 前关闭）
    if not token:
        return {"type": "websocket.close", "code": 1008}

        # 复用你的鉴权与用户加载
    try:
        # account = await db_find_one_account(filters={"token": token})
        user_id = await redis_instance.get_key_ex(name=f"token:{token}",ttl_ms=30*24*60*60*1000)
            
        if not user_id:
            return {"type": "websocket.close", "code": 1008}

        uid = user_id
        user = await db_find_one_user(id=uid)
        if not user:
            return {"type": "websocket.close", "code": 1008}
            
        token_verify = await manager.token_verify(key=workflow_id + "_" + user_id,update_token=update_token) 
        if not token_verify:
            return {"type": "websocket.close", "code": 1008}

        scope["user_id"] = uid
    except Exception:
        # 内部异常：可用 1011，表示服务器错误
        return {"type": "websocket.close", "code": 1011}
    return {"code": 0}


@ws_router.websocket("/workflow")
async def ws_endpoint(ws: WebSocket):
    result = await ws_verity_token(ws.scope)
    if result["code"] != 0:
        return await ws.send(result)

    await ws.accept()
    user_id = ws.scope.get("user_id", None)
    idle_timeout = 180

    try:
        while True:
            try:
                data_json = await asyncio.wait_for(ws.receive_json(), timeout=idle_timeout)
                req:WorkflowUpdateRequest = WorkflowUpdateRequest.model_validate(data_json)
                if req.code != 20001:
                    await ws.send_json({
                        "code": 9999,
                        "data": "",
                        "msg": "code error",
                    })

                    if ws.application_state == WebSocketState.CONNECTED:
                        with contextlib.suppress(Exception):
                            await ws.close(code=1001, reason="code error")
                    break
                
                token_verify = await manager.token_verify(key=req.data.id + "_" + user_id,update_token=req.update_token) 
                if not token_verify:
                    await ws.send_json({
                        "code": 10000,
                        "data": "",
                        "msg": "invalid update token",
                    })

                    if ws.application_state == WebSocketState.CONNECTED:
                        with contextlib.suppress(Exception):
                            await ws.close(code=1001, reason="invalid update token")
                    break
                    
                await db_save(workflowUpdate=req.data,user_id=user_id)
                await ws.send_json({
                    "code": 10001,
                    "data": "",
                    "msg": "succusseful",
                })
            
            except WebSocketDisconnect:
                # 客户端主动断开
                break
            
            except  asyncio.TimeoutError:
                # 空闲超时：可先告知再关闭（都用 safe_send，避免断线再抛错）
                await ws.send_json({
                    "code": 4001,
                    "data": "",
                    "msg": "idle timeout",
                })
                if ws.application_state == WebSocketState.CONNECTED:
                    with contextlib.suppress(Exception):
                        await ws.close(code=1001, reason="idle timeout")
                break
            
            except ValidationError as e:
                # Pydantic 校验失败，返回 422 风格的信息
                await ws.send_json({
                    "code": 422,
                    "data": "",
                    "msg":  str(e),
                })
            except asyncio.CancelledError:
                if ws.application_state == WebSocketState.CONNECTED:
                    try:
                        await ws.close(code=1001, reason="server shutting down")
                    except Exception:
                        pass
                raise

            except Exception as e:
                # 其他未知异常
                await ws.send_json({
                    "code": 500,
                    "data": "",
                    "msg": str(e),
                })
        
    finally:
        # 确保最终关闭（幂等）
        with contextlib.suppress(Exception):
            if ws.application_state == WebSocketState.CONNECTED:
                await ws.close(code=1000)