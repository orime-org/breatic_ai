from __future__ import annotations
import logging
import os
from typing import Any
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel
from app.editor.model.base_model import ModelError

class LLMOpenRouter(BaseModel):
    _instance = None
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        
        self.api_key = os.environ.get("OPENROUTER_API_KEY", "")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }

    async def acall(self, messages: Any, **kwargs) -> str:
        payload = {
            "model": kwargs.get("model", "deepseek/deepseek-chat-v3-0324"),
            "messages": messages,
            "response_format": kwargs.get("response_format",{ "type": "text" }),
            "stream": kwargs.pop("stream", False),
            "max_tokens": kwargs.pop("max_tokens", 64 * 1024),
            "temperature": kwargs.pop("temperature", 1.5),
            "reasoning": kwargs.pop("reasoning", {"enabled": False}),
            "usage": kwargs.pop("usage", {"include": True}),
        }

        resp = await self.post_with_retry0(
            path="https://openrouter.ai/api/v1/chat/completions",
            headers=self.headers,
            json=payload,
            retries=kwargs.pop("retries", 2),
        )
        try:
            data = resp.json()
            choices = data.get("choices") or []
            if choices:
                
                usage_stats = data["usage"]
                usage_cost = usage_stats['cost']
                # 转换为模型积分
                model_credits = usage_cost * 100 
                used_credits = model_credits * self.credits_profit
                                
                return {"data": choices[0]["message"]["content"],"credits": used_credits,"model_credits": model_credits}
        except Exception as e:
            logging.error("LLMOpenRouter acall error {e}")
            raise ModelError(BizCode.MODEL_REQUEST_FAILED.code, f"LLMOpenRouter acall error {e}")


    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

llm_openrouter_instance = LLMOpenRouter()