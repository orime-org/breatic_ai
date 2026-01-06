import os
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel

class VisionDoubaoSeed(BaseModel):
    """
    火山引擎 大模型 种子模型 1.6 视觉模型
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
        # self.base_url = "https://ark.cn-beijing.volces.com/api/v3"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }
    

    async def acall(self, messages: str,**kwargs) -> str:
        # ALLOWED = {"size", "image"}
        # 构建 API 调用参数
        payload = {
            "model": kwargs.pop("model", "doubao-seed-1-6-vision-250815"),
            "messages": messages,
            "stream": kwargs.pop("stream", False),
        }
        resp = await self.post_with_retry0(
            path="https://ark.cn-beijing.volces.com/api/v3/chat/completions",
            headers=self.headers,
            json=payload,
        )
        
        data = resp.json()
        if data.get("error"):
            raise LLMError(data["error"]["code"], data["error"]["message"])

        choices = data.get("choices") or []
        if choices:
            usage = data["usage"]
            prompt_tokens = usage["prompt_tokens"]
            completion_tokens = usage["completion_tokens"]
            model_credits = 0
            if prompt_tokens < 32 * 1024: 
                model_credits = (prompt_tokens * 0.8 / 100_0000 + completion_tokens * 8 / 100_0000 ) * 100 / self.currency
            elif prompt_tokens < 128 * 1024: 
                model_credits = (prompt_tokens * 1.2 / 100_0000 + completion_tokens * 16 / 100_0000 ) * 100 / self.currency 
            else:
                model_credits = (prompt_tokens * 2.4 / 100_0000 + completion_tokens * 24 / 100_0000 ) * 100 / self.currency 
            used_credits = model_credits * self.credits_profit
                                
            task_result = choices[0]["message"]["content"]
            return {"data": task_result,"credits": used_credits,"model_credits": model_credits}
        raise LLMError(BizCode.MODEL_REQUEST_FAILED.code, f"VisionDoubaoSeed acall error {data}")
    
    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

vision_doubao_seed_vision_instance = VisionDoubaoSeed()