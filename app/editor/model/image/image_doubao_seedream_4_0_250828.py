from __future__ import annotations
import os
import random
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.editor.model.base_model import LLMError
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel

class ImageDoubaoSeedream(BaseModel):
    """
    字节跳动 图像生成模型
    """

    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        self.currency  = float(os.getenv("CURRENCY_RMB",0))
        seed = random.randint(100_000, 999_999)
        self.api_key = os.environ.get("VOLCENGINE_API_KEY", "")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }

    async def acall(self, messages: str,**kwargs) -> str:
        seed = random.randint(100_000, 999_999)
        ALLOWED = {"ratio", "image"}
        if ratio := kwargs.get("ratio"):
            if ratio == "16:9":
                kwargs["ratio"] = "2560x1440"
            elif ratio == "1:1":
                kwargs["ratio"] = "2048x2048"
            elif ratio == "9:16":
                kwargs["ratio"] = "1440x2560"
        payload = {
            "model": kwargs.get("model", "doubao-seedream-4-0-250828"),
            "prompt":  messages,
            "stream": False,
            "sequential_image_generation": "disabled",
            "response_format": "url",
            "size": kwargs.pop("ratio", "2048x2048"),
            "watermark": False,
            "seed": seed
        }
       

        payload.update({k: kwargs[k] for k in ALLOWED if k in kwargs})
        
        resp = await self.post_with_retry0(
            path="https://ark.cn-beijing.volces.com/api/v3/images/generations",
            headers=self.headers,
            json=payload,
            retries=kwargs.pop("retries", 2),
        )
        
        completion = resp.json() 
        if completion.get("error"):
            raise LLMError(completion["error"]["code"], completion["error"]["message"])
        else:
            for data in completion["data"]:
                url = data["url"]
                oss_result = await aliyun_oss_instance.upload_from_url0(url, extension=".png",prefix="image")
                status = oss_result["status"]
                if status != "success":
                    raise LLMError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")
                else:
                    generated_images = completion["usage"]["generated_images"]
                   
                    model_credits = generated_images * 0.2 / self.currency * 100
                  
                    used_credits = model_credits * self.credits_profit
                    
                    data["url"] = oss_result["resource_url"]
                    return {"data": completion["data"],"credits": used_credits,"model_credits": model_credits}

    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

image_Doubao_seedream_instance = ImageDoubaoSeedream()