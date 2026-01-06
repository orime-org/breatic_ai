# -*- coding: utf-8 -*-
# pip install "redis>=5"
import asyncio
import random
import uuid
from typing import Optional, Tuple, Callable, Dict, Tuple as TTuple
from redis.asyncio import Redis

# -------------------- Lua 脚本（原样保留） --------------------
_LOCK_RELEASE_LUA = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
"""

_LOCK_RENEW_LUA = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
else
  return 0
end
"""

_SEM_ACQUIRE_LUA = """
local now = redis.call('TIME')
local now_ms = now[1] * 1000 + math.floor(now[2] / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now_ms)
local cnt = redis.call('ZCARD', KEYS[1])
if cnt < tonumber(ARGV[1]) then
  local expire_at = now_ms + tonumber(ARGV[3])
  local added = redis.call('ZADD', KEYS[1], 'NX', expire_at, ARGV[2])
  if added == 1 then
    redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[3]))
    return {1, cnt + 1, expire_at}
  end
end
return {0, cnt, 0}
"""

_SEM_RELEASE_LUA = """
local removed = redis.call('ZREM', KEYS[1], ARGV[1])
local cnt = redis.call('ZCARD', KEYS[1])
if cnt == 0 then
  redis.call('DEL', KEYS[1])
end
return {removed, cnt}
"""

_SEM_RENEW_LUA = """
local now = redis.call('TIME')
local now_ms = now[1] * 1000 + math.floor(now[2] / 1000)
local s = redis.call('ZSCORE', KEYS[1], ARGV[1])
if not s then
  return 0
end
local expire_at = now_ms + tonumber(ARGV[2])
redis.call('ZADD', KEYS[1], expire_at, ARGV[1])
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]))
return expire_at
"""

class RedisConcurrencyClient:
    """
    只做“分布式锁 + 并发槽位”的业务逻辑；
    Redis 连接由外部（FastAPI lifespan）管理，并通过 redis_getter() 注入。
    """

    def __init__(self, prefix: str = "app:"):
        self.prefix = prefix
        self._heartbeats: Dict[TTuple[str, str], asyncio.Task] = {}
        self._redis_getter: Optional[Callable[[], Redis]] = None

    # 提供一个绑定 getter 的接口（在 lifespan 里调用）
    def bind_redis_getter(self, getter: Callable[[], Redis]) -> None:
        self._redis_getter = getter

    # 内部取 Redis 的统一入口
    def _r(self) -> Redis:
        if self._redis_getter is None:
            raise RuntimeError("Redis getter is not bound. Call bind_redis_getter() in app lifespan.")
        return self._redis_getter()
    

    # ---------- 工具 ----------
    def _k(self, kind: str, name: str) -> str:
        return f"{self.prefix}{kind}:{name}"
    
    async def set_key(self, name: str,value, ttl_ms: int, nx: bool = True) -> None:
        key = self._k("set", name)
        r = self._r()
        await r.set(key, value, nx=nx, px=ttl_ms)
    
    async def get_key(self, name: str):
        key = self._k("set", name)
        r = self._r()
        return await r.get(key)
    
    async def get_key_ex(self, name: str,ttl_ms: int):
        key = self._k("set", name)
        r = self._r()
        return await r.getex(name=key,px=ttl_ms)

    async def del_key(self, name: str) -> None:
        key = self._k("set", name)
        r = self._r()
        await r.delete(key)

    # ---------- 资源回收（仅停止心跳任务；不关闭 Redis 连接） ----------
    async def aclose(self) -> None:
        # 安全地取消不同 loop 上创建的任务
        for (_, _), task in list(self._heartbeats.items()):
            try:
                loop = task.get_loop()
            except AttributeError:
                loop = None
            if loop and loop is not asyncio.get_running_loop():
                # 在任务自己的 loop 上取消
                loop.call_soon_threadsafe(task.cancel)
            else:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        self._heartbeats.clear()

    # =================================================================
    #                          分布式锁：显式 acquire/release
    # =================================================================
    async def lock_try_acquire(self, name: str, ttl_ms: int) -> Optional[str]:
        r = self._r()
        key = self._k("lock", name)
        token = uuid.uuid4().hex
        ok = await r.set(key, token, nx=True, px=ttl_ms)
        return token if ok else None

    async def lock_acquire(
        self,
        name: str,
        ttl_ms: int = 10_000,
        timeout_ms: Optional[int] = None,
        backoff_ms: tuple[int, int] = (50, 150),
        fencing_counter_key: Optional[str] = None,
    ) -> Tuple[str, Optional[int]]:
        r = self._r()
        key = self._k("lock", name)
        loop = asyncio.get_running_loop()
        deadline = None if timeout_ms is None else (loop.time() + timeout_ms / 1000)

        while True:
            cand = uuid.uuid4().hex
            ok = await r.set(key, cand, nx=True, px=ttl_ms)
            if ok:
                fence = None
                if fencing_counter_key:
                    fence = await r.incr(fencing_counter_key)
                return cand, fence

            if deadline is not None and loop.time() >= deadline:
                raise TimeoutError(f"acquire lock '{name}' timed out")

            low, high = backoff_ms
            await asyncio.sleep(random.uniform(low, high) / 1000)

    async def lock_release(self, name: str, token: str) -> bool:
        r = self._r()
        key = self._k("lock", name)
        res = await r.eval(_LOCK_RELEASE_LUA, 1, key, token)

        hb = self._heartbeats.pop((name, token), None)
        if hb:
            try:
                loop = hb.get_loop()
            except AttributeError:
                loop = None
            if loop and loop is not asyncio.get_running_loop():
                loop.call_soon_threadsafe(hb.cancel)
            else:
                hb.cancel()
                try:
                    await hb
                except asyncio.CancelledError:
                    pass

        return res == 1

    async def lock_renew(self, name: str, token: str, ttl_ms: int) -> bool:
        r = self._r()
        key = self._k("lock", name)
        res = await r.eval(_LOCK_RENEW_LUA, 1, key, token, str(ttl_ms))
        return res == 1

    def start_lock_heartbeat(self, name: str, token: str, ttl_ms: int, ratio: float = 0.4) -> None:
        step = max(50, int(ttl_ms * ratio))
        key = (name, token)
        if key in self._heartbeats:
            return

        async def _loop():
            try:
                while True:
                    await asyncio.sleep(step / 1000)
                    ok = await self.lock_renew(name, token, ttl_ms)
                    if not ok:
                        return
            except asyncio.CancelledError:
                pass
            finally:
                self._heartbeats.pop(key, None)

        self._heartbeats[key] = asyncio.create_task(_loop())

    async def stop_lock_heartbeat(self, name: str, token: str) -> None:
        task = self._heartbeats.pop((name, token), None)
        if task:
            try:
                loop = task.get_loop()
            except AttributeError:
                loop = None
            if loop and loop is not asyncio.get_running_loop():
                loop.call_soon_threadsafe(task.cancel)
            else:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    # =================================================================
    #                          并发槽位（信号量）
    # =================================================================
    async def acquire_request_slot(
        self,
        name: str,
        max_concurrent: int,
        ttl_ms: int = 10_000,
        timeout_ms: Optional[int] = None,
        backoff_ms: tuple[int, int] = (50, 150),
    ) -> Optional[str]:
        r = self._r()
        key = self._k("sem", name)
        loop = asyncio.get_running_loop()
        deadline = None if timeout_ms is None else (loop.time() + timeout_ms / 1000)
        rid = uuid.uuid4().hex

        while True:
            ok, active, expire_at = await r.eval(_SEM_ACQUIRE_LUA, 1, key, max_concurrent, rid, ttl_ms)
            if int(ok) == 1:
                return rid

            if deadline is not None and loop.time() >= deadline:
                return None

            low, high = backoff_ms
            await asyncio.sleep(random.uniform(low, high) / 1000)

    async def release_request_slot(self, name: str, request_id: str) -> bool:
        r = self._r()
        key = self._k("sem", name)
        removed, active = await r.eval(_SEM_RELEASE_LUA, 1, key, request_id)
        return removed == 1

    async def renew_request_slot(self, name: str, request_id: str, ttl_ms: int) -> bool:
        r = self._r()
        key = self._k("sem", name)
        res = await r.eval(_SEM_RENEW_LUA, 1, key, request_id, ttl_ms)
        return res != 0

redis_instance = RedisConcurrencyClient(prefix="breatic:")