from typing import Any
import logging
import os
import copy
import random
from app.editor.model.base_model import LLMError
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel

class VideoDoubaoSeedance(BaseModel):
    """
    火山引擎 大模型 种子模型 1.0 视频模型
    """
    
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        self.currency  = float(os.getenv("CURRENCY_RMB",0))
        
        self.api_key = os.environ.get("VOLCENGINE_API_KEY", "")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }
    
    async def acall(self, messages: Any,**kwargs) -> str:
        payload_message = copy.deepcopy(messages)
        for item in payload_message:
            if item["type"] == "text":
                item["text"] = item["text"] + f" --rs 720p  --ratio {kwargs.get('ratio', '16:9')} --dur 5  --fps 16 --wm false"
        seed = random.randint(100_000, 999_999)
        payload = {
            "model": kwargs.get("model", "doubao-seedance-1-0-pro-250528"),
            "content": payload_message,
            "seed": seed
        }
        resp = await self.post_with_retry0(
            path="https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
            headers=self.headers,
            json=payload,
        )
       
        data = resp.json()
        return await self.get_video(data["id"])
    
    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

    async def get_video(self, id: str):
        while True:
            try:
                video_url = f"https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{id}"
                response = await self.get_with_retry0(video_url,headers=self.headers)
                video = response.json()
                if video.get("error"):
                    raise LLMError(video["error"]["code"], video["error"]["message"])
                if video["status"] == "succeeded":
                    logging.info(f"LLMDoubaoSeedance get_video response: {video}")
                    source_url = video["content"]["video_url"]
                    oss_result = await aliyun_oss_instance.upload_from_url0(source_url,prefix="video",extension=".mp4")
                    status = oss_result["status"]
                    if status != "success":
                        raise LLMError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")
                    else:
                        total_usage = video["usage"]["total_tokens"]
                        video["content"]["video_url"] = oss_result["resource_url"] 
                        model_credits = total_usage * 15 / 100_0000 / self.currency * 100
                        used_credits = model_credits * self.credits_profit
                        return {"data": video["content"],"credits": used_credits,"model_credits": model_credits}

                elif video["status"] == "failed":
                    logging.error(f"LLMDoubaoSeedance get_video failed: {video}")
                    raise LLMError(BizCode.MODEL_STATUS_FAILED.code, f"LLMDoubaoSeedance get_video failed: {video}")

            except Exception as e:
                logging.error(f"LLMDoubaoSeedance get_video error: {e}")
                raise LLMError(BizCode.MODEL_REQUEST_FAILED.code, f"LLMDoubaoSeedance get_video error: {e}")

video_Doubao_seedance_instance = VideoDoubaoSeedance()