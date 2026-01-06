from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from app.utils.core import get_user_id
from .db import get as db_get, create as db_create,delete as db_delete,save as db_save,query as db_query,count as db_workflow_count,copy as db_copy
from app.api.workflow.model.workflow import Workflow
from app.api.workflow.pydantic_model.workflow_pydantic import WorkflowUpdate
from app.api.workflow.pydantic_model.file_upload_pydantic import FileUploadBase64
from fastapi.encoders import jsonable_encoder
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.common.biz_response import BizCode
from app.common.redis_concurrency_client import redis_instance 
from app.api.workflow.utils.workflow_conn_manager import manager 

base_router = APIRouter(
    prefix='/base',
    tags=['base']
)

@base_router.get('/query')
async def query(pageSize: int = 10 , pageNum: int = 1):
    """
    查询工作流列表

    Args:
        pageSize (int, optional): 每页数量. Defaults to 10.
        pageNum (int, optional): 页码. Defaults to 1.
    Returns:
        JSONResponse: 包含工作流列表的JSON响应
    """

    result = await db_query(page=pageNum,page_size=pageSize,user_id=get_user_id())
    return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(result),
        "msg": "",
    })


@base_router.get('/get/{id}')
async def get(id: str):
    """
    查询工作流详情

    Args:
        id (str): 工作流ID
    Returns:
        JSONResponse: 包含工作流详情的JSON响应
    """
    result = await db_get(id=id,user_id=get_user_id())
    if not result or len(result) == 0:
        return JSONResponse(content={
            "code": "500",
            "data": None,
            "msg": "workflow not found",
        })

    update_token_key = result["workflow"]["id"] + "_" + get_user_id()
    update_token = await manager.add_update_token(key=update_token_key)

    result["update_token"] = update_token
    
    return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(result),
        "msg": "",
    })

@base_router.post('/create')
async def create_workflow(workflowUpdate: WorkflowUpdate):
    """
    创建一个新的工作流
    
    Args:
        None
    Returns:
        JSONResponse: 包含创建结果的JSON响应
    """
    workflow = Workflow()
    workflow.user_id = get_user_id()
    workflow.create_by = get_user_id()

    token, fence = await redis_instance.lock_acquire(f"create_workflow:user:{workflow.user_id}")
    try:
        if workflowUpdate.workflow_name:
            workflow.workflow_name = workflowUpdate.workflow_name
        else:
            user_workflow_count = await db_workflow_count(user_id=workflow.user_id)
            workflow.workflow_name = f"breatic_{user_workflow_count+1}"
            
        result = await db_create(workflow)
        return JSONResponse(content={
            "code": 0,
            "data": jsonable_encoder(result),
            "msg": "",
        })
    finally:
        await redis_instance.lock_release(f"create_workflow:user:{workflow.user_id}",token) 

@base_router.post('/save')
async def save_workflow(workflowUpdate: WorkflowUpdate):
    """
    保存工作流详情
    
    Args:
        workflowUpdate (WorkflowUpdate): 包含工作流更新信息的Pydantic模型
    Returns:
        JSONResponse: 包含保存结果的JSON响应
    """
    result = await db_save(workflowUpdate=workflowUpdate,user_id=get_user_id())
    return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(result),
        "msg": "",
    })

@base_router.post('/editor_save')
async def editor_save_workflow(workflowUpdate: WorkflowUpdate):
    """
    保存工作流详情
    
    Args:
        workflowUpdate (WorkflowUpdate): 包含工作流更新信息的Pydantic模型
    Returns:
        JSONResponse: 包含保存结果的JSON响应
    """
    result = await db_save(workflowUpdate=workflowUpdate,user_id=get_user_id())
    return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(result),
        "msg": "",
    })

@base_router.post("/copy/{id}")
async def save_workflow(id: str):
    """
    复制工作流详情
    
    Args:
        id (str): 工作流ID
    Returns:
        JSONResponse: 包含复制结果的JSON响应
    """
    result = await db_copy(id=id,user_id=get_user_id())
    return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(result),
        "msg": "",
    })

@base_router.post('/delete/{id}')
async def delete_workflow(id: str):
    """
    删除工作流
    
    Args:
        id (str): 工作流ID
    Returns:
        JSONResponse: 包含删除结果的JSON响应
    """

    workflow = await db_delete(id=id,user_id=get_user_id())
    return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(workflow),
        "msg": "",
    })


@base_router.post("/screen/upload_base64")
async def upload_screen_workflow(payload: FileUploadBase64):
    oss_result = await aliyun_oss_instance.upload_base640(base64_data=payload.content_base64,extension=".png",prefix="upload/image/")
    status = oss_result["status"]
    if status != "success":
        return JSONResponse(content={
            "code": BizCode.OSS_UPLOAD_FAILED.code,
            "data": "",
            "msg": BizCode.OSS_UPLOAD_FAILED.msg,
        })

  
    workflowUpdate = WorkflowUpdate()
    workflowUpdate.id = payload.id
    workflowUpdate.workflow_screen_pic = oss_result["resource_url"]
    await db_save(workflowUpdate=workflowUpdate,user_id=get_user_id())

    return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(oss_result["resource_url"]),
        "msg": "",
    })

@base_router.post("/icon/upload_base64")
async def upload_icon_workflow(payload: FileUploadBase64):
     oss_result = await aliyun_oss_instance.upload_base640(base64_data=payload.content_base64,extension=".jpeg",prefix="upload/image/")
     status = oss_result["status"]
     if status != "success":
        return JSONResponse(content={
            "code": BizCode.OSS_UPLOAD_FAILED.code,
            "data": "",
            "msg": BizCode.OSS_UPLOAD_FAILED.msg,
        })
     workflowUpdate = WorkflowUpdate()
     workflowUpdate.id = payload.id
     workflowUpdate.workflow_icon = oss_result["resource_url"]
     await db_save(workflowUpdate=workflowUpdate,user_id=get_user_id())
     return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(oss_result["resource_url"]),
        "msg": "",
     })





