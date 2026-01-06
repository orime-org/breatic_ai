import io
from tkinter import NO
from typing import Any, Self, Dict, List, Optional, Union

from requests import get
import aiohttp
import asyncio
import json
import logging
import os
import sys
import time
import httpx
import math
import threading
from functools import wraps
import jwt,uuid
from app.cdn.aliyun_oss import aliyun_oss_instance
# from app.agent.model.video.audio_utils import process
from app.editor.model.base_model import LLMError
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel
from app.common.httpx_client import httpx_client

class FalLipSync(BaseModel):

    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        self.currency  = float(os.getenv("CURRENCY_RMB",0))

        self.api_key = os.environ.get("FAL_API_KEY", "")
        # self.base_url = "https://ark.cn-beijing.volces.com/api/v3"
        self.headers = {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }
    
    async def acall(self, messages: Any,**kwargs) -> str:
        payload = {
            "model": "lipsync-2",
            "video_url": messages,
            "audio_url": kwargs.get("source_audio",""),
            "sync_mode": kwargs.get("cut_video_model",""),
        }
        resp = await self.post_with_retry0(
            path="https://queue.fal.run/fal-ai/sync-lipsync/v2",
            headers=self.headers,
            json=payload,
        )
       
        data = resp.json()
        return await self.get_video(data["request_id"])
    
    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

    async def get_video(self, id: str):
        while True:
            try:
                video_url = f"https://queue.fal.run/fal-ai/sync-lipsync/requests/{id}/status"
                response = await self.get_with_retry0(video_url,headers=self.headers)
                video = response.json()
                if video["status"] == "COMPLETED":
                    video_result_url = f"https://queue.fal.run/fal-ai/sync-lipsync/requests/{id}"
                    res = await self.get_with_retry0(video_result_url,headers=self.headers)
                    video_result = res.json()
                    logging.info(f"FalLipSync get_video response: {video_result}")
                    source_url = video_result["video"]["url"]
                    oss_result = await aliyun_oss_instance.upload_from_url0(source_url,prefix="video",extension=".mp4")
                    status = oss_result["status"]
                   
                    if status != "success":
                        raise LLMError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")
                    else:
                        # total_usage = video["usage"]["total_tokens"]
                        # video["content"]["video_url"] = oss_result["resource_url"] 
                        # model_credits = total_usage * 15 / 100_0000 / self.currency * 100
                        # used_credits = model_credits * self.credits_profit
                        return {"data":  oss_result["resource_url"] ,"credits": 0,"model_credits": 0}

            except Exception as e:
                logging.error(f"FalLipSync get_video error: {e}")
                raise LLMError(BizCode.MODEL_REQUEST_FAILED.code, f"FalLipSync get_video error: {e}")

fal_lip_sync_instance = FalLipSync()