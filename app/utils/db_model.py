from typing import Any, Iterable
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, inspect as sa_inspect
from pydantic import BaseModel
from datetime import datetime, timezone

class UpdatableMixin:
    __pk_name__: str = "id"
    __updatable_fields__: tuple[str, ...] | None = None
    __json_merge_fields__: tuple[str, ...] = ()

    @classmethod
    async def update_one(
        cls,
        session: AsyncSession,
        pk: Any,
        patch: BaseModel | dict,
        *,
        exclude_none: bool = True,
        with_for_update: bool = False,
    ):
        # 1) 规范化 patch
        if isinstance(patch, BaseModel):
            data = patch.model_dump(exclude_unset=True, exclude_none=exclude_none)
        elif isinstance(patch, dict):
            data = {k: v for k, v in patch.items() if not (exclude_none and v is None)}
        else:
            raise TypeError("patch must be a Pydantic model or dict")

        # 2) 允许字段
        if cls.__updatable_fields__ is None:
            mapper = sa_inspect(cls).mapper
            allowed = {a.key for a in mapper.column_attrs if a.key != cls.__pk_name__}
        else:
            allowed = set(cls.__updatable_fields__)
        json_merge = set(cls.__json_merge_fields__)

        # 3) 读行
        if with_for_update:
            res = await session.execute(
                select(cls).where(getattr(cls, cls.__pk_name__) == pk).with_for_update()
            )
            obj = res.scalar_one_or_none()
        else:
            obj = await session.get(cls, pk)

        if obj is None:
            raise ValueError(f"{cls.__name__}({cls.__pk_name__}={pk}) not found")

        # 4) 应用补丁
        for k, v in data.items():
            if k not in allowed:
                continue
            if k in json_merge and isinstance(v, dict):
                cur = getattr(obj, k) or {}
                setattr(obj, k, {**cur, **v})
            else:
                setattr(obj, k, v)

        # 5) 更新时间（可选）
        if hasattr(obj, "update_time"):
            obj.update_time = datetime.now(timezone.utc)

        await session.flush()
        return obj