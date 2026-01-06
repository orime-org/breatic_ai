from __future__ import annotations
import json
import logging
import os
import httpx
from typing import Any, Dict
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.editor.model.base_model import LLMError
from app.common.biz_response import BizCode
import io
from app.editor.model.base_model import BaseModel
from app.common.httpx_client import httpx_client

class ImageTopazUpscalar(BaseModel):
    """
    Topaz 图像超分模型
    """

    _instance = None

    def __init__(self):
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        self.api_key = os.environ.get("TOPAZ_API_KEY", "")
        self.headers = {
            "X-API-Key": self.api_key,
            "Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }

    async def post_with_retry1(
        self,
        path: str,
        fields: Dict[str, Any],               # ← 改名
        *,
        force_multipart: bool = True,         # 如果接口必须 multipart         # 如果接口要 JSON，把这设为 True
    ) -> httpx.Response:
        url = path or ""
        # 选择编码方式
        request_kwargs: Dict[str, Any] = {}
        if force_multipart:
            # multipart/form-data（无文件也行）：用 files 生成 boundary
            files = []
            for k, v in fields.items():
                if isinstance(v, (dict, list)):
                    files.append((k, (None, json.dumps(v), "application/json")))
                else:
                    files.append((k, (None, str(v), "text/plain; charset=utf-8")))
            request_kwargs["files"] = files
        else:
            request_kwargs["data"] = fields

        resp = await httpx_client.run_with_retries(do_request=lambda cli: cli.post(url,
                headers=self.headers,
                 **request_kwargs,
            ))
        return resp
        

    async def acall(self, messages: str,**kwargs) -> str:
        # ALLOWED = {"size", "image"}
        payload = {
            "model": "Standard V2",
            "source_url": messages,
            "output_height":  kwargs.get("output_height",0),
            "output_width": kwargs.get("output_width",0),
        }
        resp = await self.post_with_retry1(
            path="https://api.topazlabs.com/image/v1/enhance/async",
            fields=payload,
            retries=kwargs.pop("retries", 3),
        )
        data = resp.json()
        return await self.check_status(data['process_id'])

    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }
    async def check_status(self,process_id: str):
        while True:
            try:
                response = await self.get_with_retry0("https://api.topazlabs.com/image/v1/status",headers=self.headers)
                datas = response.json()
                for data in datas:
                    if data["process_id"] == process_id and data["status"] == "Completed":
                        credits = data["credits"]
                        model_credits = credits * 0.1 * 100 
                        used_credits = model_credits * self.credits_profit
                        task_result = await self.query_task(process_id)
                        return {"data": task_result,"credits": used_credits,"model_credits": model_credits}
                                
                    elif data["process_id"] == process_id and (data["status"] == "Cancelled" or data["status"] == "Failed"):
                        logging.error(f"ImageTopazUpscalar check_status Cancelled {response.status}: {data}")
                        # raise RuntimeError(f"ImageTopazUpscalar check_status Failed {response.status}: {data}")
                        raise LLMError(BizCode.MODEL_STATUS_FAILED.code, f"ImageTopazUpscalar check_status Failed {response.status}: {data}")
            except Exception as e:
                logging.error(f"ImageTopazUpscalar check_status error: {e}")
                raise LLMError(BizCode.MODEL_REQUEST_FAILED.code, f"ImageTopazUpscalar check_status error: {e}")

    async def query_task(self,process_id: str):
        try:
            response = await self.get_with_retry0(f"https://api.topazlabs.com/image/v1/download/{process_id}",headers=self.headers)
            # response = await httpx_client.instance().get(f"https://api.topazlabs.com/image/v1/download/{process_id}", headers=self.headers, verify=False)
            response.raise_for_status()
            image = response.json()
            download_url = image["download_url"]
            oss_result  = await aliyun_oss_instance.upload_from_url0(download_url, extension=".jpg",prefix="image")
            status = oss_result["status"]
            if status != "success":
                raise LLMError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")
            else:
                return oss_result["resource_url"]
        except Exception as e:
            logging.error(f"ImageTopazUpscalar query_task error: {e}")
            raise LLMError(BizCode.MODEL_REQUEST_FAILED.code, f"ImageTopazUpscalar query_task error: {e}")

image_topaz_upscalar_instance = ImageTopazUpscalar()