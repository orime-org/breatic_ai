from sqlalchemy.ext.asyncio.session import AsyncSession


import os
import asyncio
import asyncpg
from functools import wraps
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql import text
import logging
from contextvars import ContextVar
from sqlalchemy.exc import DBAPIError
from typing import Optional
from app.utils.core import is_running_in_docker
logger = logging.getLogger(__name__)

# from app.utils.core import is_running_in_prod
# 将 asyncpg 的序列化错误视作可重试的短暂性错误
SERIALIZATION_EXCEPTIONS = (asyncpg.exceptions.SerializationError,)
# ----------------------
# SQLAlchemy 方式
# ----------------------

# 从环境变量获取配置（带默认值）
DB_USER = os.getenv("POSTGRES_USER", "")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
DB_NAME = os.getenv("POSTGRES_DATABASE", "")
DB_HOST = "postgres" if is_running_in_docker() else os.getenv("POSTGRES_HOST", "")
DB_PORT = int(os.getenv("POSTGRES_PORT", 5432))

# 拼接 SQLAlchemy 的异步连接 URL
DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 创建异步引擎
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# Session 工厂
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()

# 当前协程内正在使用的 session（无则为 None）
_current_session: ContextVar[AsyncSession | None] = ContextVar[AsyncSession | None]("_current_session", default=None)
_nesting_depth: ContextVar[int] = ContextVar("_nesting_depth", default=0)

def transactional(
    _func=None,
    *,
    isolation: Optional[str] | None = "REPEATABLE READ",
    propagation: str = "REQUIRED",
    max_attempts: int = 4,
    base_delay: float = 0.05,
):
    """
    propagation:
      - "REQUIRED"     : 复用外层事务；无则新建（默认）
      - "NESTED"       : 在外层事务内使用 SAVEPOINT（需要外层已在事务中）
      - "REQUIRES_NEW" : 无条件新建独立会话/事务，与外层互不影响

    retry: 只有当本次调用会新建 session/事务（即 owner=True）时才会进行重试；
           如果复用外层 session（existing 不为 None 且 propagation != "REQUIRES_NEW"），只执行一次。
    """
    propagation = (propagation or "REQUIRED").upper()

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 外部已提供的 session（优先于 contextvar）
            existing = kwargs.get("session") or _current_session.get()

            # 决定是否允许重试：只有当当前调用将新建会话时（即 owner 情况）才允许重试
            owner_possible = (propagation == "REQUIRES_NEW" or existing is None)
            attempts_allowed = max_attempts if owner_possible else 1

            attempt = 0
            while True:
                attempt += 1
                owner = False

                # 决定这次调用用哪个 session（每次重试都新建 session，以避免污染）
                if propagation == "REQUIRES_NEW" or existing is None:
                    # 新会话 -> 新事务；注意：每次重试都新建 session
                    session = AsyncSessionLocal()
                    owner = True
                else:
                    # 复用外层会话（不能在复用外层会话时重试）
                    session = existing

                # 把本次选择的 session 放入上下文，供更内层复用
                token_sess = _current_session.set(session)
                token_depth = _nesting_depth.set(_nesting_depth.get() + 1)

                try:
                    if owner:
                        # 只有拥有者需要管理生命周期
                        async with session:
                            # 只在最外层事务设置隔离级别（且必须在任何 SQL 之前）
                            if isolation:
                                await session.execute(text(f"SET TRANSACTION ISOLATION LEVEL {isolation}"))

                            kwargs["session"] = session

                            if propagation == "NESTED" and existing is not None:
                                # 语义：如果声明 NESTED 但其实没有外层，那就退化为普通事务
                                async with session.begin_nested():  # SAVEPOINT
                                    result = await func(*args, **kwargs)
                            else:
                                result = await func(*args, **kwargs)

                            # commit 成功则返回
                            await session.commit()
                            return result

                    else:
                        # 非拥有者：不能随意提交/回滚，只跑自己的逻辑
                        kwargs["session"] = session

                        if propagation == "NESTED":
                            # 外层应已在事务中；使用保存点隔离内层失败
                            async with session.begin_nested():
                                return await func(*args, **kwargs)
                        else:
                            return await func(*args, **kwargs)

                except DBAPIError as e:
                    # 检查是否为被封装的 asyncpg serialization error
                    orig = getattr(e, "orig", None)
                    is_serialization = orig is not None and isinstance(orig, SERIALIZATION_EXCEPTIONS)

                    if is_serialization and attempt < attempts_allowed:
                        # 对 owner 做回滚/关闭并重试；对非 owner（复用外层会话）不重试（attempts_allowed==1）
                        if owner:
                            try:
                                await session.rollback()
                            except Exception:
                                pass
                            try:
                                await session.close()
                            except Exception:
                                pass

                        # 指数退避 + 随机抖动
                        delay = base_delay * (2 ** (attempt - 1)) * (1 + random.random())
                        await asyncio.sleep(delay)
                        # 继续下一个 attempt
                        continue
                    # 不是可重试的序列化错误或已超过尝试次数，抛出
                    raise

                except SERIALIZATION_EXCEPTIONS:
                    # 直接抛出的 asyncpg.exceptions.SerializationError（未被 DBAPIError 包裹）
                    if attempt < attempts_allowed:
                        if owner:
                            try:
                                await session.rollback()
                            except Exception:
                                pass
                            try:
                                await session.close()
                            except Exception:
                                pass

                        delay = base_delay * (2 ** (attempt - 1)) * (1 + random.random())
                        await asyncio.sleep(delay)
                        continue
                    raise

                except Exception:
                    # 其它异常：确保 owner 的事务回滚，然后抛出
                    if owner:
                        try:
                            await session.rollback()
                        except Exception:
                            pass
                    raise

                finally:
                    # 恢复上下文
                    _current_session.reset(token_sess)
                    _nesting_depth.reset(token_depth)
                    if owner:
                        try:
                            # 在异常/重试分支中 session 可能已关闭，但 safe 处理
                            await session.close()
                        except Exception:
                            pass

                # 如果循环不 continue（不再重试），那么跳出并抛出最后的异常（但逻辑上我们已经在 except 中抛出）
                break

        return wrapper

    return decorator if _func is None else decorator(_func)