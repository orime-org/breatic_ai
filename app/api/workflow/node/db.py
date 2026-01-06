from app.api.workflow.model.workflow_node_exec import WorkflowNodeExec
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.transactional import transactional
from app.api.workflow.model.node_template import NodeTemplate
from app.api.workflow.model.snapshot_template_node import SnapshotTemplateNode
from app.api.workflow.model.snapshot_template import SnapshotTemplate
from app.api.workflow.pydantic_model.snapshot_template_pydantic import SnapshotTemplateIn
from app.utils.db_page import clamp_page
from collections import defaultdict
from typing import Optional, Dict
from sqlalchemy.exc import NoResultFound
from app.api.workflow.pydantic_model.node_result_exec_pydantic import WorkflowNodeExecBaseIn,WorkflowNodeExecBaseDetailIn

@transactional()
async def db_results_detail_update(workflowNodeExecBaseDetailIn: WorkflowNodeExecBaseDetailIn,user_id: str,session: AsyncSession):
    """
    保存工作流节点执行结果详情
    """
    stmt = (
        select(WorkflowNodeExec)
        .where(
            WorkflowNodeExec.id == workflowNodeExecBaseDetailIn.id,
            WorkflowNodeExec.user_id == user_id,
        )
    )
    exec_result = await session.execute(stmt)
    workflowNodeExec: WorkflowNodeExec = exec_result.scalar_one_or_none()

    exec_results = workflowNodeExec.exec_result

    for exec_result in exec_results:
        for result in exec_result["result"]:
            if result["id"] == workflowNodeExecBaseDetailIn.result_id:
                result["data"] = workflowNodeExecBaseDetailIn.data
                break
    
    stmt_upd = (
        update(WorkflowNodeExec)
        .where(WorkflowNodeExec.id == workflowNodeExecBaseDetailIn.id,WorkflowNodeExec.user_id == user_id)
        .values(
            exec_result=exec_results,
        ).returning(WorkflowNodeExec.id)
    )
    result = await session.execute(stmt_upd)
    maybe_id = result.scalar_one_or_none()
    return maybe_id

@transactional()
async def db_results_update(workflowNodeExecBaseIn: WorkflowNodeExecBaseIn,user_id: str,session: AsyncSession):
    """
    保存工作流节点执行结果
    """
    stmt_upd = (
        update(WorkflowNodeExec)
        .where(WorkflowNodeExec.id == workflowNodeExecBaseIn.id,WorkflowNodeExec.user_id == user_id)
        .values(
            exec_result=workflowNodeExecBaseIn.exec_result,
        ).returning(WorkflowNodeExec.id)
    )
    result = await session.execute(stmt_upd)
    maybe_id = result.scalar_one_or_none()
    return maybe_id

@transactional()
async def save_node_snapshot(snapshotTemplateIn: SnapshotTemplateIn,user_id: str,session: AsyncSession):
    """
    保存节点快照
    """
    snapshotTemplate = SnapshotTemplate(** snapshotTemplateIn.model_dump(exclude_none=True, exclude={"details"}))
    snapshotTemplate.user_id = user_id
    session.add(snapshotTemplate)
    await session.flush()
    # 保存节点快照
    snapshotTemplateNodes = []

    for detail in snapshotTemplateIn.details:
        snapshotTemplateNode = SnapshotTemplateNode()
        snapshotTemplateNode.snapshot_template_id = snapshotTemplate.id
        snapshotTemplateNode.content = detail
        snapshotTemplateNodes.append(snapshotTemplateNode)

    session.add_all(snapshotTemplateNodes)
    await session.flush()

    return snapshotTemplate

@transactional()
async def query_node_snapshot(page: int, page_size: int, workflow_id: str,user_id: str, session: AsyncSession):
    """
    查询节点快照并按创建时间聚合（先按快照分页，再回表聚合）
    """
    page, page_size, offset = clamp_page(page=page, page_size=page_size)

    # 统计总数（以快照为单位）
    total_count = await session.scalar(
        select(func.count(SnapshotTemplate.id)).where(SnapshotTemplate.workflow_id == workflow_id, SnapshotTemplate.user_id == user_id,SnapshotTemplate.is_delete == 0)
    )
    total_count = total_count or 0
    total_pages = (total_count + page_size - 1) // page_size

    if total_count == 0:
        return {"records": [], "total": 0, "size": page_size, "current": page, "pages": 0}

    # 第一步：仅按快照分页，拿到这一页的快照 id（保持稳定排序）
    subq = (
        select(SnapshotTemplate.id, SnapshotTemplate.create_time)
        .where(SnapshotTemplate.workflow_id == workflow_id, SnapshotTemplate.user_id == user_id,SnapshotTemplate.is_delete == 0)
        .order_by(SnapshotTemplate.create_time.desc(), SnapshotTemplate.id.desc())
        .offset(offset)
        .limit(page_size)
        .subquery()
    )

    # 第二步：用这一页的快照 id 回表把需要的字段与子表取全
    stmt = (
        select(
            SnapshotTemplate.id.label("snapshot_id"),
            SnapshotTemplate.node_template_id,
            SnapshotTemplate.create_time,
            SnapshotTemplate.snapshot_template_name,
            SnapshotTemplate.remark,
            NodeTemplate.template_name,
            NodeTemplate.template_icon,
            NodeTemplate.template_code,
            SnapshotTemplateNode.content,
        )
        .join(subq, subq.c.id == SnapshotTemplate.id)
        .join(NodeTemplate, NodeTemplate.id == SnapshotTemplate.node_template_id, isouter=True)
        .join(SnapshotTemplateNode, SnapshotTemplateNode.snapshot_template_id == SnapshotTemplate.id, isouter=True)
        # 保持与第一页相同的快照顺序，其次可按子项稳定排序
        .order_by(SnapshotTemplate.create_time.desc(), SnapshotTemplate.id.desc())
    )

    result = await session.execute(stmt)
    rows = [dict(r._mapping) for r in result]

    # 分组：先按 create_time -> 再按 snapshot_id
    from collections import defaultdict, OrderedDict
    grouped_by_time: dict[str, dict] = OrderedDict()

    def fmt(dt):
        return dt.strftime("%Y-%m-%d") if dt else ""

    for r in rows:
        time_key = fmt(r["create_time"])
        if time_key not in grouped_by_time:
            grouped_by_time[time_key] = {"create_time": time_key, "result": []}

        # 以快照 id 作为唯一项
        result_bucket = grouped_by_time[time_key]["result"]
        snapshot_id = r["snapshot_id"]
        found = next((it for it in result_bucket if it["id"] == str(snapshot_id)), None)

        if not found:
            found = {
                "id": str(snapshot_id),
                "snapshot_template_name": r.get("snapshot_template_name") or "",
                "template_icon": r.get("template_icon") or "",
                "template_code": r.get("template_code") or "",
                "remark": r.get("remark") or "",
                "details": [],
            }
            result_bucket.append(found)

        if r.get("content") is not None:
            # 与示例结构一致：details 是包含 {"content": ...} 的对象列表
            found["details"].append(r["content"] )

    # 因为 subquery 已经按时间倒序，grouped_by_time 的插入顺序天然就是倒序；
    # 如果你想再显式排序，也可以：
    aggregated_records = list(grouped_by_time.values())

    return {
        "records": aggregated_records,
        "total": total_count,
        "size": page_size,
        "current": page,
        "pages": total_pages,
    }


@transactional()
async def db_delete_snapshot(id: str,user_id: str,session: AsyncSession):
    """
    删除节点快照
    """

    stmt = (
         update(SnapshotTemplate)  
        .where(SnapshotTemplate.id == id, SnapshotTemplate.user_id == user_id)
        .values(is_delete=1)
        .returning(SnapshotTemplate.id, SnapshotTemplate.snapshot_template_name)  
    )
    result = await session.execute(stmt)
    row = result.one_or_none()  
    return {"id": row.id, "snapshot_template_name": row.snapshot_template_name} 


@transactional()
async def db_node_results(node_id: str,user_id: str,session: AsyncSession):
    """
    获取节点执行结果
    """
    stmt = (
        select(WorkflowNodeExec)
        .where(WorkflowNodeExec.node_id == node_id, WorkflowNodeExec.user_id == user_id)
        .order_by(WorkflowNodeExec.create_time.desc())
    )
    result = await session.execute(stmt)
    rows = result.all()
    return [dict(r._mapping) for r in rows]

@transactional()
async def db_result_save(
    work_flow_node_exec: WorkflowNodeExec,
    node_exec_id: Optional[str],
    session: AsyncSession,
) -> Dict[str, int]:
    """
    保存节点执行结果：
    - 若提供 node_exec_id，则按 id 更新 WorkflowNodeExec；否则插入一条新记录。
    返回：
        {"node_exec_id": <int>}
    """

    # 1) 主表：更新 or 插入
    saved_id: int
    if node_exec_id is not None and node_exec_id != "":
        stmt_upd = (
            update(WorkflowNodeExec)
            .where(WorkflowNodeExec.id == node_exec_id)
            .values(
                exec_time=work_flow_node_exec.exec_time,
                exec_result=work_flow_node_exec.exec_result,
                node_content=work_flow_node_exec.node_content,
            )
            .returning(WorkflowNodeExec.id)
        )
        result = await session.execute(stmt_upd)
        maybe_id = result.scalar_one_or_none()
        if maybe_id is None:
            # 明确告诉调用方：你给的 node_exec_id 在库里不存在
            raise NoResultFound(f"WorkflowNodeExec id {node_exec_id} not found for update.")
        saved_id = maybe_id
    else:
        session.add(work_flow_node_exec)
        # flush 以获取自增/雪花 ID
        await session.flush()
        saved_id = work_flow_node_exec.id
    # 3) 统一再 flush 一次，保证更改都刷到数据库（早失败早抛）
    await session.flush()
    return {"node_exec_id": saved_id}

 

@transactional()
async def db_update_snapshot(id: str,user_id: str,snapshot_template_name: str,session: AsyncSession):
    """
    更新节点快照
    """
    stmt = (
         update(SnapshotTemplate)  
        .where(SnapshotTemplate.id == id, SnapshotTemplate.user_id == user_id)
        .values(snapshot_template_name=snapshot_template_name)
        .returning(SnapshotTemplate.id, SnapshotTemplate.snapshot_template_name)  
    )
    result = await session.execute(stmt)
    row = result.one_or_none()  
    return {"id": row.id, "snapshot_template_name": row.snapshot_template_name}


def transform(data: list[dict]) -> list[dict]:
    grouped = defaultdict(lambda: {"group_type": None,"group_type_code": None, "group_type_icon": None, "details": []})

    for item in data:
        group_key = item["group_type"]
        group = grouped[group_key]

        group["group_type"] = item["group_type"]
        group["group_type_code"] = item["group_type_code"]
        group["group_type_icon"] = item.get("group_type_icon", "")

        detail = {
            "id": item["id"],
            "template_name": item["template_name"],
            "template_icon": item.get("template_icon", ""),
            "template_code": item["template_code"],
            "sort_level": item["sort_level"],
            "content": item.get("content", {}),
            "remark": item.get("remark", ""),
        }

        group["details"].append(detail)

    return list(grouped.values())