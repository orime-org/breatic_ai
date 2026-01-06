import json
import os
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.editor.model.base_model import BaseModel
from app.editor.model.base_model import LLMError
from app.common.biz_response import BizCode

class TTSDoubao(BaseModel):
    
    def __init__(self):  
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        self.currency  = float(os.getenv("CURRENCY_RMB",0))

        self.appID = os.environ.get("VOLCENGINE_APP_ID", "")
        self.accessKey =  os.environ.get("VOLCENGINE_ACCESS_KEY","") 
        resourceID = "seed-tts-1.0"
        self.headers = {
            "X-Api-App-Id": self.appID,
            "X-Api-Access-Key": self.accessKey,
            "X-Api-Resource-Id": resourceID,
            "X-Api-App-Key": "aGjiRDfUWi",
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        }
          
 
    async def acall(self, messages: str,**kwargs) -> str:
        payload = {
            "user": {
                "uid": kwargs.get("c_id",  "123456")
            },
            "req_params":{
                "text": messages,
                "speaker": kwargs.get("voice_type",  "zh_female_wanqudashu_moon_bigtts"),
                "audio_params": {
                    "format": kwargs.get("format",  "mp3"),
                    "sample_rate": 24000,
                    "enable_timestamp": True
                },
                "additions": "{\"disable_markdown_filter\":true, \"enable_timestamp\":true}\"}"
            }
        }

        response = await self.post_with_retry0(
            path="https://openspeech.bytedance.com/api/v3/tts/unidirectional",
            headers=self.headers,
            json=payload,
            retries=kwargs.pop("retries", 3),
        )
          
        return await self.audio_upload(response)
 

    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

    async def audio_upload(self,resp):
        # 如果服务端是“逐行 JSON”
        # audio_data = bytearray()
        audio_data = []
        sentences = []
        # 逐行读取（字符串），相当于 requests.iter_lines(decode_unicode=True)
        async for line in resp.aiter_lines():
            if not line:
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                 # 遇到心跳/非 JSON 行时跳过
                continue

            code = int(data.get("code", 0))
            # 音频分片
            if code == 0 and data.get("data"):
                # chunk_audio = base64.b64decode(data["data"])
                audio_data.extend(data["data"].strip())
                continue

            # 句子增量
            if code == 0 and data.get("sentence"):
                sentences.append(data["sentence"])
                # 如果你想实时回调，可以在这里 yield / 回调
                continue

            # 结束信号
            if code == 20000000:
                break

            # 其他错误
            if code > 0:
                raise LLMError(code, line)

        if audio_data:
            joined = "".join(audio_data)
            
            oss_result  = await aliyun_oss_instance.upload_base640(joined, extension=".mp3",prefix="audio")
            status = oss_result["status"]
            if status != "success":
                raise LLMError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")
            else:
                model_credits = 5 / 1_0000 * len(sentences[0]["text"]) / self.currency * 100
                used_credits = model_credits * self.credits_profit
                return {"data": oss_result["resource_url"],"credits": used_credits,"model_credits": model_credits}

tts_doubao_instance = TTSDoubao()