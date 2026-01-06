import asyncio
import contextlib
from typing import Any, Dict, Set, Optional
from sqlalchemy import false, true
from starlette.websockets import WebSocket, WebSocketState
from app.common.redis_concurrency_client import redis_instance
import secrets
from datetime import datetime, timezone

class WorkflowConnManager:

    async def token_verify(self, key: str,update_token: str) -> bool:
        if not update_token:
            return False
        token = await redis_instance.get_key_ex(name=f"workflow:user:sync:{key}",ttl_ms=300*1000)
        if token == update_token:
            return True
        return False
                   
    async def add_update_token(self, key: str):
        update_token = self.gen_token_rand12_tsms()
        await redis_instance.set_key(name=f"workflow:user:sync:{key}",value=update_token,ttl_ms=300*1000,nx=False)
        return update_token
    
    def gen_token_rand12_tsms(self) -> str:
        # 12 位随机数（包含前导 0）
        rand12 = f"{secrets.randbelow(10**12):012d}"
        # UTC 毫秒时间戳（13 位，当前年代一般是 13 位）
        ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        return f"{rand12}_{ts_ms}"

manager = WorkflowConnManager()