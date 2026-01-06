from typing import Any
import logging
import os
import time
import jwt
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.editor.model.base_model import LLMError
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel

class VideoKlingEffect(BaseModel):

    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        self.currency  = float(os.getenv("CURRENCY_RMB",0))

        self.ak = os.environ.get("KLING_ACCESS_KEY", "")
        self.sk = os.environ.get("KLING_SECRET_KEY", "")
        # self.base_url = "https://api-beijing.klingai.com"
    
        self.api_key = self.encode_jwt_token()
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }   
    
    async def acall(self, messages: Any,**kwargs) -> str:
        self.api_key = self.encode_jwt_token()
        self.headers["Authorization"] = f"Bearer {self.api_key}"
        payload = {
            "video_url": kwargs.get("video_url", ""),
            "sound_effect_prompt": messages,
        }
        resp = await self.post_with_retry0(
            path="https://api-beijing.klingai.com/v1/audio/video-to-audio",
            headers=self.headers,
            json=payload,
            retries=kwargs.pop("retries", 3),
        )
        data = resp.json()
        if data["code"] == 0:
            return await self.get_video(data["data"]["task_id"])
        else:
            raise LLMError(BizCode.MODEL_CODE_FAILED.code, f"AudioKlingEffect acall unknown status: {data}")
    
    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

    def encode_jwt_token(self):
        headers = {
            "alg": "HS256",
            "typ": "JWT"
        }
        payload = {
            "iss": self.ak,
            "exp": int(time.time()) + 1800, # 有效时间，此处示例代表当前时间+1800s(30min)
            "nbf": int(time.time()) - 5 # 开始生效的时间，此处示例代表当前时间-5秒
        }
        token = jwt.encode(payload, self.sk, headers=headers)
        return token

    async def get_video(self, id: str):
        while True:
            try:
                video_url = f"https://api-beijing.klingai.com/v1/audio/video-to-audio/{id}"
                response = await self.get_with_retry0(video_url,headers=self.headers)
                video = response.json()
                if video["code"] == 0 and video["data"]["task_status"] == "succeed":
                    logging.info(f"AudioKlingEffect get_video response: {video}")
                    url = video["data"]["task_result"]["videos"][0]["url"]
                    oss_result  = await aliyun_oss_instance.upload_from_url0(url, extension=".mp4",prefix="video")
                    status = oss_result["status"]
                    if status != "success":
                        raise LLMError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")
                    else:
                        model_credits = 0.25 / self.currency * 100
                        used_credits = model_credits * self.credits_profit
                        return {"data": oss_result["resource_url"],"credits": used_credits,"model_credits": model_credits}
                elif video["code"] == 0 and video["data"]["task_status"] == "failed":
                    logging.error(f"AudioKlingEffect get_video failed: {video}")
                    raise LLMError(BizCode.MODEL_STATUS_FAILED.code, f"AudioKlingEffect get_video failed: {video}")
                elif video["code"] != 0:
                    logging.error(f"AudioKlingEffect get_video unknown status: {video}")
                    raise LLMError(BizCode.MODEL_CODE_FAILED.code, f"AudioKlingEffect get_video unknown status: {video}")
            except Exception as e:
                logging.error(f"AudioKlingEffect get_video error: {e}")
                raise LLMError(BizCode.MODEL_REQUEST_FAILED.code, f"AudioKlingEffect get_video error: {e}")

video_kling_effect_instance = VideoKlingEffect()