from __future__ import annotations
from collections.abc import Iterable
import asyncio
import httpx
import logging
from app.common.httpx_client import httpx_client
from app.common.biz_response import BizCode

class ModelError(RuntimeError):   
    def __init__(self, status: int, body: str):
        super().__init__(f"LLM API error {status}: {body[:512]}")
        self.status = status
        self.body = body

class LLMError(RuntimeError):  
    def __init__(self, status: int, body: str):
        super().__init__(f"LLM API error {status}: {body[:512]}")
        self.status = status
        self.body = body

class BaseModel:
    
    async def acall(self, messages: str,**kwargs) -> str:
        pass

    def call(self, messages: Any,**kwargs) -> str:
        pass

    async def acall_stream(self, messages: str,**kwargs) -> str:
        pass

    async def post_with_retry0(
        self,
        path: str,
        json: Dict[str, Any] = None,
        headers: Dict[str, str] = None,
        retries: int = 3,
    ) -> httpx.Response:
        url = path or ""
        resp = await httpx_client.run_with_retries(
            do_request=lambda cli: cli.post(url, json=json,headers=headers),
            # attempts=retries,
            first_ephemeral=False,
            buffer_response=True,
        )
        return resp
    
    async def get_with_retry0(
        self,
        path: str,
        headers: Dict[str, str] = None,
        retries: int = 3,
    ) -> httpx.Response:
        url = path or ""
        return await httpx_client.run_with_retries(
            do_request=lambda cli: cli.get(url,headers=headers),
            attempts=retries,
            first_ephemeral=False,
            buffer_response=True,
        )

    def parse_content(self,message, content,**kwargs):
        pass 

    async def batch_acall_stream(
        self,
        items: Iterable[Tuple[Any, Dict[str, Any]]],
        *,
        total_timeout: float = 120.0,
    ) -> Tuple[Dict[int, str], Dict[int, Exception]]:

        async def _one(idx: int, messages: Any, kwargs: Dict[str, Any]):
            try:
                content = await self.acall(messages, **kwargs)
                event = self.parse_content(messages,content, **kwargs)
                event["index"] = idx
                event["status"] = "success"
                event["status_code"] = 0
                event["msg"] = ""
                logging.info(f"model quest info {event}")
                event.pop("model_credits","")
                return event
            except ModelError as e:
                return {"index": idx, "status": "error", "status_code": e.status, "msg": e.body}
            except LLMError as e:
                return {"index": idx, "status": "error", "status_code": e.status, "msg": e.body}
            except httpx.HTTPStatusError as e:
                detail = e.response.text
                return {"index": idx, "status": "error", "status_code": e.response.status_code, "msg": detail}
            except Exception as e:
                return {"index": idx, "status": "error", "status_code": BizCode.MODEL_REQUEST_FAILED.code, "msg": str(e)}
        
            
        tasks: List[asyncio.Task] = [asyncio.create_task(_one(i, m, kw)) for i, (m, kw) in enumerate(items)]
        try:
            async with asyncio.timeout(total_timeout):
                for fut in asyncio.as_completed(tasks):
                    try:
                        event = await fut
                        yield event
                    except Exception as e:
                        yield {"status": "error", "status_code": BizCode.MODEL_REQUEST_FAILED.code, "msg": str(e)}
        except asyncio.TimeoutError as e:
            yield {"status": "error","status_code": 500, "msg": repr(e)}
        finally:
            for t in tasks:
                if not t.done():
                    t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)