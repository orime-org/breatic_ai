from __future__ import annotations
from ast import Try
from collections.abc import Iterable
from math import log
import random
import asyncio
import httpx,inspect
import logging
from typing import Callable, Awaitable, Union,Iterable,Optional
from contextlib import asynccontextmanager

RETRYABLE_STATUS: set[int] = {408, 425, 429, 500, 502, 503, 504}
RETRYABLE_EXC = (
    httpx.ConnectError,
    httpx.ReadError,
    httpx.WriteError,
    httpx.RemoteProtocolError,
    httpx.TimeoutException,
)
IDEMPOTENT_METHODS = {"GET", "HEAD", "OPTIONS"}

HTTPGetter = Union[Callable[[], httpx.AsyncClient],
                   Callable[[], Awaitable[httpx.AsyncClient]]]

class HttpxClient:

    def __init__(self):
        self._http_getter: HTTPGetter | None = None

    def bind_http_getter(self, http_getter: HTTPGetter) -> None:
        """绑定一个函数，返回（或异步返回）同一个 AsyncClient 实例。"""
        self._http_getter = http_getter
    
    def new_client_like(self, c: httpx.AsyncClient) -> httpx.AsyncClient:
        # 创建“短命”的一次性客户端，尽量复用同样的参数
        return httpx.AsyncClient(
            http2=True,
            verify=False, 
            follow_redirects=c.follow_redirects, 
            timeout=httpx.Timeout(connect=10, read=300, write=300, pool=10),
            limits=httpx.Limits(max_connections=128, max_keepalive_connections=64, keepalive_expiry=15),
        )


    def instance(self) -> httpx.AsyncClient:
        """仅同步 getter 可用；若绑定了异步 getter 会抛错。"""
        if self._http_getter is None:
            return httpx.AsyncClient(
                http2=True,
                verify=False,                        
                timeout=30,
                limits=httpx.Limits(max_connections=128, max_keepalive_connections=64, keepalive_expiry=15),
            )
        res = self._http_getter()
        return res

    def is_h2_goaway(self, exc: Exception) -> bool:
        def has_kw(e):
            if not e: 
                return False
            s = str(e).lower()
            return "goaway" in s or "connectionterminated" in s or "http/2" in s
        return has_kw(exc) or has_kw(getattr(exc, "__cause__", None)) or has_kw(getattr(exc, "__context__", None))


    @asynccontextmanager
    async def choose_client(self, base: httpx.AsyncClient, ephemeral: bool):
        if ephemeral:
            async with self.new_client_like(base) as tmp:
                yield tmp
        else:
            yield base

    async def run_with_retries(
        self, 
        do_request: Callable[[httpx.AsyncClient], Awaitable[httpx.Response]],
        *,
        attempts: int = 3,
        first_ephemeral: bool = False,
        retry_on_status: Iterable[int] = RETRYABLE_STATUS,
        idempotent: Optional[bool] = True,
        backoff: float = 0.25,
        backoff_factor: float = 2.0,
        jitter: float = 0.15,
        buffer_response: bool = True,   # True：把响应读入内存，安全返回
    ) -> httpx.Response:
        """
        - do_request(client): 动态注入“如何发请求”的函数，只负责发；重试/异常由本函数处理
        """
        retry_on_status = set(retry_on_status)
        use_ephemeral = first_ephemeral
        last_exc: Optional[Exception] = None
        resp: httpx.Response | None = None  # ← 预设
        for i in range(attempts):
            try:
                async with self.choose_client(self.instance(), ephemeral=use_ephemeral) as cli:
                    resp = await do_request(cli)
                    if buffer_response:
                        await resp.aread()
                # 状态码可重试（仅对幂等或你显式允许时）
                if resp.status_code in retry_on_status and (idempotent is True):
                    if i != attempts - 1:
                        await asyncio.sleep(backoff + random.uniform(0, jitter))
                        backoff *= backoff_factor
                        use_ephemeral = False  # 状态码问题不必强制换连接
                        continue
                resp.raise_for_status()
                return resp

            except RETRYABLE_EXC as e:
                last_exc = e
                # H2 的 GOAWAY：下一次换“新客户端/新连接”重试
                if self.is_h2_goaway(e):
                    use_ephemeral = True
                # 非幂等请求默认不重试（除非你显式传 idempotent=True 或自己做了幂等键）
                if not idempotent:
                    raise e
                if i == attempts - 1:
                    raise e
                await asyncio.sleep(backoff + random.uniform(0, jitter))
                backoff *= backoff_factor
            except Exception as e:
                logging.error(f"Request failed: {e}")
                raise e
                
        if last_exc:
            raise last_exc
        return resp

httpx_client = HttpxClient()
