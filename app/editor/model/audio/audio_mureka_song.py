import os
import logging
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel
from app.editor.model.base_model import ModelError
from app.cdn.aliyun_oss import aliyun_oss_instance

class AudioMurekaSong(BaseModel):
    
    def __init__(self):  
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        self.currency  = float(os.getenv("CURRENCY_RMB",0))

        self.api_key =  os.environ.get("MUREKA_API_KEY","") 
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }
    
    async def acall_song(self,messages: str,**kwargs):
        payload = {
            "lyrics": kwargs.get("lyrics", ""),
            "model": kwargs.get("model", "mureka-7.5"),
            "n":1,
            "prompt": messages,
        }
        response = await self.post_with_retry0(
            path="https://api.mureka.cn/v1/song/generate",
            headers=self.headers,
            json=payload,
        )
        resp = response.json()
        return await self.query_task(f"https://api.mureka.cn/v1/song/query/{resp['id']}")
       
    async def acall_instrumental(self,messages: str,**kwargs):
       
        payload = {
            "model": kwargs.get("model", "mureka-7.5"),
            "prompt": messages,
            "n":1,
            "stream": False
        }
        response = await self.post_with_retry0(
            path="https://api.mureka.cn/v1/instrumental/generate",
            headers=self.headers,
            json=payload,
        )
        resp = response.json()
        return await self.query_task(f"https://api.mureka.cn/v1/instrumental/query/{resp['id']}")
 
    async def acall(self, messages: str,**kwargs) -> str:
        instrumental = kwargs.get("instrumental", True)
        if instrumental:
            return await self.acall_instrumental(messages,**kwargs)
        else:
            return await self.acall_song(messages,**kwargs)
 

    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

    async def query_task(self,url: str):
        while True:
            try:
                response = await self.get_with_retry0(url,headers=self.headers)
                audio = response.json()
                if audio["status"] == "succeeded":
                    logging.info(f"AudioMurekaSong query_task response: {audio}")
                    url = audio["choices"][0]["url"]
                    oss_result  = await aliyun_oss_instance.upload_from_url0(url, extension=".mp3",prefix="audio")
                    status = oss_result["status"]
                    if status != "success":
                        raise ModelError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")         
                    else:
                        model = audio["model"]
                        if model == "mureka-o1":
                            model_credits = 1.25 / self.currency * 100
                        else:
                            model_credits = 0.25 / self.currency * 100
                            used_credits = model_credits * self.credits_profit
    
                        return {"data": oss_result["resource_url"],"credits": used_credits,"model_credits": model_credits}
                        
                elif audio["status"] == "failed":
                    logging.error(f"AudioMurekaSong query_task failed: {audio}")
                    raise ModelError(BizCode.MODEL_STATUS_FAILED.code, f"AudioMurekaSong status query_task failed: {audio}")

            except Exception as e:
                logging.error(f"AudioMurekaSong query_task error: {e}")
                raise ModelError(BizCode.MODEL_REQUEST_FAILED.code, f"AudioMurekaSong request query_task: {e}")

audio_mureka_song_instance = AudioMurekaSong()