from app.api.workflow.pydantic_model.snapshot_template_pydantic import SnapshotTemplateIn
from fastapi import APIRouter, Body, Query
from fastapi.responses import JSONResponse
from app.utils.core import get_user_id
from .db import db_results_detail_update,save_node_snapshot as db_save_snapshot,db_delete_snapshot as db_delete_snapshot,db_update_snapshot as db_update_snapshot,query_node_snapshot as db_query_snapshot,db_node_results as db_node_results
from fastapi.encoders import jsonable_encoder
from app.api.workflow.pydantic_model.snapshot_template_pydantic import SnapshotTemplateUpdateIn
from app.api.workflow.pydantic_model.file_upload_pydantic import FileUploadBase64,FileUploadUrl
from app.utils.file_utils import write_file_base64
from fastapi import File, UploadFile
from app.api.workflow.pydantic_model.node_pydantic import NodeBaseIn
from app.editor.node.node_factory import get_node
from fastapi.requests import Request
from fastapi.responses import StreamingResponse
import asyncio
import contextlib
import json
from app.api.workflow.pydantic_model.node_result_exec_pydantic import WorkflowNodeExecBaseIn,WorkflowNodeExecBaseDetailIn
from app.api.workflow.node.db import db_results_update
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.locales.translations import get_node_template_records
from app.common.biz_response import BizCode
from app.utils.id_generator import generate_id


node_router = APIRouter(
    prefix='/node',
    tags=['node']
)

@node_router.get('/query')
async def query(pageSize: int = 999 , pageNum: int = 1):
    resp = get_node_template_records()
    return JSONResponse(content={
        "code": 0,
        "data": resp,
        "msg": "",
    })

@node_router.post('/upload_form')
async def uplord_form(file: UploadFile = File(...)):
     oss_result = await aliyun_oss_instance.oss_put_object_threaded(file)
     status = oss_result["status"]
     if status != "success":
        return JSONResponse(content={
            "code": BizCode.OSS_UPLOAD_FAILED.code,
            "data": "",
            "msg": BizCode.OSS_UPLOAD_FAILED.msg,
        })
     return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(oss_result["resource_url"]),
        "msg": "",
     })

@node_router.post('/upload_base64')
async def upload_base64(payload: FileUploadBase64):
     oss_result = await aliyun_oss_instance.upload_base640(base64_data=payload.content_base64,extension=".jpeg",prefix="upload/image/")
     status = oss_result["status"]
     if status != "success":
        return JSONResponse(content={
            "code": BizCode.OSS_UPLOAD_FAILED.code,
            "data": "",
            "msg": BizCode.OSS_UPLOAD_FAILED.msg,
        })
     return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(oss_result["resource_url"]),
        "msg": "",
     })

@node_router.post('/upload_url')
async def upload_url(file_upload_url: FileUploadUrl):
     try:
        oss_result = await aliyun_oss_instance.upload_from_url0(source_url=file_upload_url.url,extension=file_upload_url.url.split(".")[-1],prefix="upload/"+file_upload_url.file_type)
        status = oss_result["status"]
        if status != "success":
            return JSONResponse(content={
                "code": BizCode.OSS_UPLOAD_FAILED.code,
                "data": "",
                "msg": BizCode.OSS_UPLOAD_FAILED.msg,
            })
     except Exception as e:
        return JSONResponse(content={
            "code": BizCode.OSS_UPLOAD_FAILED.code,
            "data": "",
            "msg": BizCode.OSS_UPLOAD_FAILED.msg,
        })
     return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(oss_result["resource_url"]),
        "msg": "",
     })

@node_router.post('/results/save')
async def save_results(workflowNodeExecBaseIn: WorkflowNodeExecBaseIn):
    user_id: str = get_user_id()
    maybe_id = await db_results_update(workflowNodeExecBaseIn=workflowNodeExecBaseIn,user_id=user_id)
    return JSONResponse(content={
            "code": 0,
            "data": maybe_id,
            "msg": ""
        })

@node_router.post('/results_detail/save')
async def save_results(workflowNodeExecBaseDetailIn: WorkflowNodeExecBaseDetailIn):
    user_id: str = get_user_id()
    maybe_id = await db_results_detail_update(workflowNodeExecBaseDetailIn=workflowNodeExecBaseDetailIn,user_id=user_id)
    return JSONResponse(content={
            "code": 0,
            "data": maybe_id,
            "msg": ""
    })

@node_router.post('/snapshot/save')
async def save_snapshot(snapshotTemplateIn: SnapshotTemplateIn):
     snapshot_screen_pic = snapshotTemplateIn.snapshot_screen_pic
     if snapshot_screen_pic:
          payload = FileUploadBase64(content_base64=snapshot_screen_pic)
          file_result = write_file_base64(payload)
          snapshotTemplateIn.snapshot_screen_pic = file_result["relative_path"]

     result = await db_save_snapshot(snapshotTemplateIn=snapshotTemplateIn,user_id=get_user_id())
     return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(result),
        "msg": "",
    })

@node_router.post('/snapshot/delete/{id}')
async def delete_snapshot(id: str):
     result = await db_delete_snapshot(id=id,user_id=get_user_id())
     return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(result),
        "msg": "",
    })

@node_router.post("/snapshot/update")
async def update_snapshot(payload: SnapshotTemplateUpdateIn):
    result = await db_update_snapshot(
        id=payload.id,
        user_id=get_user_id(),
        snapshot_template_name=payload.snapshot_template_name
    )
    return {"code": 0, "data": result, "msg": ""}

@node_router.get('/snapshot/query')
async def query_snapshot(workflow_id: str = Query(...) ,pageSize: int = Query(10) , pageNum: int = Query(1)):
     result = await db_query_snapshot(workflow_id=workflow_id,user_id=get_user_id(),page=pageNum,page_size=pageSize)
     return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(result),
        "msg": "",
    })

@node_router.get("/results/{id}")
async def query_node_results(id: str):
    """
    获取节点执行结果
    """
    user_id: str = get_user_id()
    result = await db_node_results(node_id=id,user_id=user_id)
    return JSONResponse(content={
        "code": 0,
        "data": jsonable_encoder(result),
        "msg": "",
    })

def sse(data: str, event: str | None = None, id: str | None = None) -> str:
    lines = []
    if event: lines.append(f"event: {event}")
    if id:    lines.append(f"id: {id}")
    for line in (data.splitlines() or [""]):
        lines.append(f"data: {line}")
    return "\n".join(lines) + "\n\n"



@node_router.post("/sse")
async def stream(request: Request,nodeBaseIn: NodeBaseIn):
    template_code = nodeBaseIn.template_code
        
    node = get_node(template_code)
    async def gen():
        q: asyncio.Queue[str | None] = asyncio.Queue()
        stop = asyncio.Event()
        
        async def heartbeat():
            try:
                while not stop.is_set():
                    await asyncio.sleep(5)
                    await q.put(sse("", event="ping", id="ping"))
            except asyncio.CancelledError:
                pass

        async def long_task():
            # ……执行业务……
            try:
                async for item in node.exec_stream(params=nodeBaseIn.model_dump(exclude_none=True, exclude_unset=True)):
                    item = jsonable_encoder(item)
                    if item.get("code") and item.get("code") == BizCode.CREDITS_NOT_ENOUGH.code:
                        id = "abort-".join(generate_id())
                        await q.put(sse(json.dumps(item, ensure_ascii=False), event="abort", id=id))
                    else:
                        id = "data-".join(generate_id())
                        await q.put(sse(json.dumps(item, ensure_ascii=False), event="data", id=id)) 
                
            except Exception as e:
                # 关键：异常不向外抛，作为 error 事件发给前端
                id = "error-".join(generate_id())
                await q.put(sse(json.dumps({"code": 500,"msg":  str(e)}, ensure_ascii=False), event="error", id=id))
            finally:
                id = "done-".join(generate_id())
                await q.put(sse(json.dumps({"done": True}), event="done", id=id))
                await q.put(None)  # 哨兵：告诉主循环可以结束了

        hb = asyncio.create_task(heartbeat())
        task = asyncio.create_task(long_task())
        try:
            while True:
                if await request.is_disconnected():
                    break
                msg = await q.get()
                if msg is None:   # 收到哨兵 -> 结束
                    break
                yield msg
        finally:
            stop.set()
            for t in (hb, task):
                t.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await t
            return  # 明确 return（可省略，函数到此自然结束）

    return StreamingResponse(gen(), media_type="text/event-stream")