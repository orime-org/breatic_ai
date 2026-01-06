from operator import truediv
import token
from fastapi import APIRouter,HTTPException,Depends,WebSocket,Request
from app.utils.core import get_user_id
from app.api.workflow.utils.workflow_conn_manager import manager 

update_token_ignore_urls = [
    "/api/workflow/base/get",
    "/api/workflow/base/query",
    "/api/workflow/base/copy",
    "/api/workflow/base/delete",
    "/api/workflow/base/create",
    "/api/workflow/base/save",
    "/api/workflow/node/query",
]

workflow_router = APIRouter(
    prefix='/workflow',
    tags=['workflow']
)

async def verify_update_token(request: Request = None):
    if request is None:
        return

    # 1) 当前路径（不含域名、不含 query）
    path = request.url.path              # e.g. "/api/workflow/xxx"
    for url in update_token_ignore_urls:
        if path.startswith(url):
            return {"path": path}

    # 3) query 参数（?a=1&b=2）
    qp = request.query_params
    update_token = qp.get("update_token")             
    workflow_id = qp.get("workflow_id")
    if not workflow_id:
        raise HTTPException(
            status_code=404, 
            detail={"code": 404, "data": {}, "msg": "workflow_id not found"} # detail 可以是字符串或字典/JSON
        )
    
    
    token_verify = await manager.token_verify(key=workflow_id + "_" + get_user_id(),update_token=update_token) 
    if not token_verify:
        raise HTTPException(
            status_code=409,
            detail={"code": 10000, "data": {}, "msg": "invalid update token"} # detail 可以是字符串或字典/JSON
        )
    return {
        "path": path,
        "update_token": update_token,
    }

async def verify_user(
    request: Request = None,     
):
    user_id = get_user_id()
    if not user_id:
        # 当 user_id 不存在时，抛出 HTTPException 异常
        # 这会阻止后续的路由函数执行，并返回 401 状态码和指定的 detail 信息
        raise HTTPException(
            status_code=401, # 或者使用 800，但 401 更符合 HTTP 语义
            detail={"code": 800, "data": {}, "msg": "need to login"} # detail 可以是字符串或字典/JSON
        )
    # 如果验证通过，可以返回 user_id，供后续路由函数使用
    return user_id


from .base.router import base_router
workflow_router.include_router(base_router, dependencies=[Depends(verify_user),Depends(verify_update_token)],)

from .node.router import node_router
workflow_router.include_router(node_router, dependencies=[Depends(verify_user),Depends(verify_update_token)])

