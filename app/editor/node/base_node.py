from app.api.workflow.node.db import db_result_save
from app.api.workflow.model.workflow_node_exec import WorkflowNodeExec
from urllib.parse import urlparse, unquote
import os
from typing import Any, AsyncIterator
from datetime import datetime, timezone
from app.api.user.db_users import find_one as db_user_find_one
from app.api.user.model.users import User
from app.locales.translations import get_node_template_records
from app.utils.core import get_user_id
from app.common.biz_response import BizCode
from app.api.user.db_users import deduct_user_credits
from app.api.transaction.model.credits_used_history import CreditsUsedHistory
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.transactional import transactional
from uuid6 import uuid7
from app.editor.model.model_factory import get_model
import time,math
from app.common.redis_concurrency_client import redis_instance
from app.api.user.db_users import calculate_user_credits

class BaseNode():

    def __init__(self):
        self.credits_verify: bool = os.getenv("CREDITS_VERIFY",False) in ("True","true", "1", "yes")

    async def exec(self, params: dict):
        pass

    async def exec_stream(self, params: dict) -> AsyncIterator[Any]:
        model_id = self.get_model_id(params)
        id = self.get_id(params)
        model = get_model(model_id)
        input_data = await self.input_data(model_id,params)
        
        if self.credits_verify:
            verify_credits_result = await self.verify_credits(model_id,len(input_data["items"]))
            if verify_credits_result["code"] != BizCode.OK.code:
                yield {
                    "code": verify_credits_result["code"],
                    "msg": verify_credits_result["msg"],
                }
                return

          
        t0 = time.perf_counter()
        exec_results = []
        node_exec_id = None
        index = 0
        async for item in model.batch_acall_stream(input_data["items"],total_timeout=input_data["total_timeout"]):
            content = item.get("content",None) 
            elapsed_sec = time.perf_counter() - t0
               
            await self.output_data(item)
            item["exec_time"] = round(elapsed_sec)
            if content:
                seed = content.get("seed",None)
                if seed:
                    item["seed"] = seed
            exec_results.append(item)
            node_exec_result = None
          
            if item["status_code"] == 0:
                user_id = get_user_id()
                used_credits_history = CreditsUsedHistory()
                used_credits_history.user_id = user_id
                used_credits_history.used_channel = model_id
                used_credits_history.used_type = str(params.get("template_code", ""))
                used_credits = math.ceil(item["credits"])
                used_credits_history.used_credits = used_credits
                item["credits"] = used_credits
                node_exec_result = await self.save_exec_result(params=params, arr=exec_results, exec_time=elapsed_sec,node_exec_id=node_exec_id,used_credits_history=used_credits_history)
            else:
                node_exec_result = await self.save_exec_result(params=params, arr=exec_results, exec_time=elapsed_sec,node_exec_id=node_exec_id,used_credits_history=None)
            
            node_exec_id = node_exec_result.get("node_exec_id")
            node_exec_result["exec_result"] = node_exec_result["exec_result"][index]
            index += 1
            yield node_exec_result

    async def input_data(self,model_id: str,params: dict):
        pass

    async def output_data(self,item: dict): 
        pass

    def get_model_id(self, params: dict) -> str:
        return params.get("model_id", "")

    def get_id(self, params: dict) -> str:
        return params.get("id", "")
    
    @transactional()
    async def save_exec_result(self, params: dict, arr: list, exec_time: float,node_exec_id,used_credits_history: CreditsUsedHistory,session: AsyncSession):
        work_flow_node_exec = WorkflowNodeExec()
        work_flow_node_exec.node_id = params.get("id", "")
        work_flow_node_exec.exec_time = round(exec_time)
        work_flow_node_exec.template_node_code = params.get("template_code")
        work_flow_node_exec.workflow_id = params.get("flow_id", "")
        work_flow_node_exec.user_id = get_user_id()  
        work_flow_node_exec.node_content = params
       
        work_flow_node_exec.create_time = datetime.now(timezone.utc)
        arr[-1]["create_time"] = int(work_flow_node_exec.create_time.timestamp())
        arr[-1]["id"] = uuid7().hex
        work_flow_node_exec.exec_result = arr  
        node_exec_result = await db_result_save(work_flow_node_exec=work_flow_node_exec,node_exec_id=node_exec_id)
        user_id = get_user_id()  
        if used_credits_history:
            redis_token, fence = await redis_instance.lock_acquire(f"user:{user_id}")
            try:
                await deduct_user_credits(used_channel=used_credits_history.used_channel, user_id=used_credits_history.user_id, used_type=used_credits_history.used_type, used_token=arr[-1]["id"], used_credits=used_credits_history.used_credits)
            finally:
                await redis_instance.lock_release(f"user:{user_id}",redis_token)
        credits = await calculate_user_credits(user_id)
        return {
            "node_exec_id": node_exec_result["node_exec_id"],
            "node_content": params,
            "total_credits": credits,
            "exec_time":  work_flow_node_exec.exec_time,
            "exec_result": arr,
        }

    async def verify_credits(self,model_id,task_num):
        records = get_node_template_records()
        credits_flag = False
        used_credits = None
        data = records.get("data", [])
        for item in data:
            
            models = item.get("content", {}).get("models")
            if not models:
                continue
            for m in models:
                if model_id == m.get("value", None):
                    used_credits = m.get("credits") * task_num
                    credits_flag = True
                    break
            if credits_flag:
                break
        if not credits_flag:
            return {
                "code": BizCode.MODEL_NOT_FOUND.code,
                "msg": BizCode.MODEL_NOT_FOUND.msg,
            }

        user_id = get_user_id()
        db_user:User = await db_user_find_one(user_id)
      
        if db_user:
            total_credits = db_user.free_credits + db_user.membership_credits + db_user.purchase_credits
            if total_credits < used_credits:
                return {
                    "code": BizCode.CREDITS_NOT_ENOUGH.code,
                    "msg": BizCode.CREDITS_NOT_ENOUGH.msg,
                }
            else:
                return {
                    "code": BizCode.OK.code,
                    "msg": "",
                }
        else:
            return {                   
                "code": 1,
                "msg": "",
            }

    def get_file_name(self, url: str):
        path = unquote(urlparse(url).path)
        filename = os.path.basename(path)                
        return os.path.splitext(filename)    

