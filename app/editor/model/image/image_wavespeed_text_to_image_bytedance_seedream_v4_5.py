from typing import Any
import logging
import os
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.editor.model.base_model import ModelError
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel


class ImageWavespeedTextToImageBytedanceSeedreamV45(BaseModel):
    """
    图片生成模型
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        self.currency  = float(os.getenv("CURRENCY_RMB",0))

        self.api_key = os.environ.get("WAVESPEED_API_KEY", "")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }
    
    async def acall(self, messages: Any,**kwargs) -> str:
        
        payload = {
            "enable_base64_output": False,
            "enable_sync_mode": False,
            "prompt": messages,
            "size": kwargs["ratio"]
        }
        resp = await self.post_with_retry0(
            path="https://api.wavespeed.ai/api/v3/bytedance/seedream-v4.5",
            headers=self.headers,
            json=payload,
        )
       
        data = resp.json()
      
        return await self.get_generate_result(data["data"]["id"])
    
    def parse_content(self,message, content,**kwargs):
        content["data"] = [{"url": content["data"]}]
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

    async def get_generate_result(self, id: str):
        while True:
            try:
                generate_result_url = f"https://api.wavespeed.ai/api/v3/predictions/{id}/result"
                response = await self.get_with_retry0(generate_result_url,headers=self.headers)
                generate_result = response.json()["data"]
                if generate_result["status"] == "completed":
                    logging.info(f"ImageWavespeedTextToImageBytedanceSeedreamV45 get_generate_result response: {generate_result}")
                    source_url = generate_result["outputs"][0]
                    oss_result = await aliyun_oss_instance.upload_from_url0(source_url,prefix="image",extension=".png")
                    status = oss_result["status"]
                    
                    if status != "success":
                        raise ModelError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")
                    else:
                        url = "https://api.wavespeed.ai/api/v3/billings/search"
                        payload = {
                            "billing_type": "deduct",
                            "prediction_uuids": [id],
                            "sort": "created_at ASC",
                            "page": 1,
                            "page_size": 10,
                        }
                        resp = await self.post_with_retry0(
                            path=url,
                            headers=self.headers,
                            json=payload,
                        )
                        resp_json = resp.json()
                        if resp_json["code"] == 200:
                            cost = resp_json["data"]["items"][0]["price"] 
                            model_credits = cost * 100
                            used_credits = model_credits * self.credits_profit
                            return {"data":  oss_result["resource_url"] ,"credits": used_credits,"model_credits": model_credits}
                        else:
                            raise ModelError(BizCode.MODEL_REQUEST_FAILED.code,str(e))

                elif generate_result["status"] == "failed":
                    raise ModelError(BizCode.MODEL_STATUS_FAILED.code, generate_result["error"])
            except ModelError as e:
                raise e
            except Exception as e:
                logging.error(f"ImageWavespeedTextToImageBytedanceSeedreamV45 get_generate_result error: {e}")
                raise ModelError(BizCode.MODEL_REQUEST_FAILED.code, f"ImageWavespeedTextToImageBytedanceSeedreamV45 get_generate_result error: {e}")

image_wavespeed_text_to_image_bytedance_seedream_v4_5_instance = ImageWavespeedTextToImageBytedanceSeedreamV45()
