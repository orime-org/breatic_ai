from typing import Any, Dict
import logging
import os
import time
import math
import jwt,uuid
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.editor.model.video.audio_utils import process
from app.editor.model.base_model import LLMError
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel

class VideoKlingLipSysnc(BaseModel):

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
    
        self.api_key = self.encode_jwt_token()
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        } 
    
    async def acall(self, messages: Any,**kwargs) -> str:
        process_result = await process(messages, kwargs.get("source_audio",""), kwargs.get("cut_video_model","cut_off"))
       
        oss_result = process_result["oss_result"]
        status = oss_result["status"]
        if status != "success":
            raise LLMError(500, f"upload to oss failed: {status}")
        else:
            messages = oss_result["resource_url"]
        self.api_key = self.encode_jwt_token()
        self.headers["Authorization"] = f"Bearer {self.api_key}"
        payload = {
            "video_url": messages,
        }
    
        resp = await self.post_with_retry0(
            path="https://api-beijing.klingai.com/v1/videos/identify-face",
            headers=self.headers,
            json=payload,
        )

        resp = resp.json()

        if resp["code"] == 0: 
            task_id = await self.create_task(resp["data"], kwargs.get("source_audio",""),process_result["time"])
            return await self.get_video(task_id)
        else:
            raise LLMError(BizCode.MODEL_STATUS_FAILED.code, f"VideoKlingLipSysnc acall unknown status: {resp}")
    
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
    
    async def create_task(self, data: Dict[str, Any],audio_url: str,end_time):
        self.api_key = self.encode_jwt_token()
        self.headers["Authorization"] = f"Bearer {self.api_key}"
        face_chooses = []

        payload = {
            "session_id": data["session_id"],
            "external_task_id": str(uuid.uuid4()),
            "face_choose": []
        }
        for face_data in data["face_data"]:
            face_choose = {
                "face_id": face_data["face_id"],
                "sound_file": audio_url,
                "sound_start_time": face_data["start_time"],
                "sound_end_time": end_time*1000,
                "sound_insert_time": 0
            }
            face_chooses.append(face_choose)
        payload["face_choose"] = face_chooses
        resp = await self.post_with_retry0(
            path="https://api-beijing.klingai.com/v1/videos/advanced-lip-sync",
            headers=self.headers,
            json=payload,
        )
       
        resp_data = resp.json()
        if resp_data["code"] == 0:
            return resp_data["data"]["task_id"]
        else:
            raise LLMError(BizCode.MODEL_STATUS_FAILED.code, f"VideoKlingLipSysnc create_task unknown status: {resp}")
    
    async def get_video(self, id: str):
        while True:
            try:
                video_url = f"https://api-beijing.klingai.com/v1/videos/advanced-lip-sync/{id}"
                response = await self.get_with_retry0(video_url,headers=self.headers)

                video = response.json()
                if video["code"] == 0 and video["data"]["task_status"] == "succeed":
                    logging.info(f"VideoKlingLipSysnc get_video response: {video}")
                    url = video["data"]["task_result"]["videos"][0]["url"]
                    oss_result = await aliyun_oss_instance.upload_from_url0(url, extension=".mp4",prefix="video")
                    status = oss_result["status"]
                    if status != "success":
                        raise LLMError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")
                    else:
                        duration = video["data"]["task_result"]["videos"][0]["duration"]
                        model_credits = math.ceil(float(duration) / 5) * 0.5 / self.currency * 100
                        used_credits = model_credits * self.credits_profit
                        return {"data": oss_result["resource_url"],"credits": used_credits,"model_credits": model_credits}
                elif video["code"] == 0 and video["data"]["task_status"] == "failed":
                    logging.error(f"VideoKlingLipSysnc get_video failed: {video}")
                    raise LLMError(BizCode.MODEL_STATUS_FAILED.code, f"VideoKlingLipSysnc get_video failed: {video}")
                elif video["code"] != 0:
                    logging.error(f"VideoKlingLipSysnc get_video unknown status: {video}")
                    raise LLMError(BizCode.MODEL_CODE_FAILED.code, f"VideoKlingLipSysnc get_video unknown status: {video}")
            except Exception as e:
                logging.error(f"VideoKlingLipSysnc get_video error: {str(e)}")
                raise LLMError(BizCode.MODEL_REQUEST_FAILED.code, f"VideoKlingLipSysnc get_video error {e}")

video_kling_lip_sysnc_instance = VideoKlingLipSysnc()