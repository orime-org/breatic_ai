from app.api.workflow.model.workflow_node_exec import WorkflowNodeExec
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.transactional import transactional
from app.api.workflow.model.workflow import Workflow
from app.api.workflow.pydantic_model.workflow_pydantic import WorkflowUpdate
from app.utils.db_page import clamp_page
from datetime import datetime, timezone


@transactional()
async def query(page: int, page_size: int,user_id: str,session: AsyncSession):
    page,page_size,offset = clamp_page(page=page,page_size=page_size)

    stmt = select(Workflow.id,Workflow.workflow_name,Workflow.workflow_version,Workflow.update_time,Workflow.create_time,Workflow.workflow_icon,Workflow.workflow_screen_pic).where(Workflow.user_id == user_id,Workflow.is_delete == 0).offset(offset).limit(page_size).order_by(Workflow.update_time.desc())
    count_stmt = select(func.count(Workflow.id)).where(Workflow.user_id == user_id,Workflow.is_delete == 0)

    result = await session.execute(stmt)
    count_result = await session.execute(count_stmt)

    records = [{"id": r[0],"workflow_name":r[1],"workflow_version":r[2],"update_time":r[3],"create_time":r[4],"workflow_icon":r[5],"workflow_screen_pic":r[6]} for r in result.all()]
    total_count = count_result.scalar()
    total_pages = (total_count + page_size - 1) // page_size

    return {
        "records": records,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@transactional()
async def get(id: str,user_id: str,session: AsyncSession):
    """
    根据主键 ID 查询工作流；未找到则返回 None
    """
    result = await session.execute(
        select(Workflow).where(Workflow.id == id,Workflow.user_id == user_id,Workflow.is_delete == 0)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        return None
    
    
    stmt = (
        select(
            WorkflowNodeExec.id,
            WorkflowNodeExec.node_id,
            WorkflowNodeExec.workflow_id,
            WorkflowNodeExec.exec_time,
            WorkflowNodeExec.exec_result,
            WorkflowNodeExec.node_content,
            WorkflowNodeExec.create_time,
        )
        .where(WorkflowNodeExec.workflow_id == id)  # 仅取每组最新一条
        .order_by(WorkflowNodeExec.create_time.desc())
    )

    res = await session.execute(stmt)
    # 想直接拿字典可用 mappings()
    rows = res.mappings().all()

    # 如果你要返回 JSON 可序列化的数据结构：
    node_exec_results = {
        "total": len(rows),
        "records": [
            {
                "id": r["id"],
                "node_id": r["node_id"],
                "workflow_id": r["workflow_id"],
                "exec_time": r["exec_time"],
                "exec_result": r["exec_result"],
                "node_content": r["node_content"],
            }
            for r in rows
        ]
    }

    return {
        "workflow": {
            "id": workflow.id,
            "workflow_name": workflow.workflow_name,
            "workflow_version": workflow.workflow_version,
            "update_time": workflow.update_time,
            "create_time": workflow.create_time,
            "workflow_icon": workflow.workflow_icon,
            "workflow_screen_pic": workflow.workflow_screen_pic,
            "content": workflow.content,
            "remark": workflow.remark,
        },
        "node_exec_results": node_exec_results,
    }

@transactional()
async def copy(id: str,user_id: str,session: AsyncSession):
    """
    根据主键 ID 查询工作流；未找到则返回 None
    """
    result = await session.execute(
        select(Workflow).where(Workflow.id == id,Workflow.user_id == user_id,Workflow.is_delete == 0)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        return None
    # 复制工作流
    new_workflow = Workflow(
        user_id=user_id,
        workflow_name=workflow.workflow_name,
        update_time=datetime.now(timezone.utc),
        create_time=datetime.now(timezone.utc),
        workflow_icon=workflow.workflow_icon,
        workflow_screen_pic=workflow.workflow_screen_pic,
        content=workflow.content,
        remark=workflow.remark,
    )

    while True:
        new_workflow.workflow_name = f"Copy_{new_workflow.workflow_name}"
        stmt = select(Workflow).where(Workflow.workflow_name == new_workflow.workflow_name,Workflow.user_id == user_id,Workflow.is_delete == 0)
        result = await session.execute(stmt)
        if result.scalar_one_or_none() is None:
            break
    
    # 加入到会话
    session.add(new_workflow)       
    # 刷新到数据库，生成主键等
    await session.flush()      
    # 返回 ORM 对象（此时已带 ID）
    return {
        "id": new_workflow.id,
        "workflow_name": new_workflow.workflow_name,
        "workflow_version": new_workflow.workflow_version,
        "update_time": new_workflow.update_time,
        "create_time": new_workflow.create_time,
        "workflow_icon": new_workflow.workflow_icon,
        "workflow_screen_pic": new_workflow.workflow_screen_pic,
        "remark": new_workflow.remark,
    }            

@transactional()
async def save(workflowUpdate: WorkflowUpdate,user_id: str,session: AsyncSession):
    """
    保存工作流
    """
    count_stmt = select(func.count(Workflow.id)).where(Workflow.id == workflowUpdate.id,Workflow.user_id == user_id,Workflow.is_delete == 0)
    count_result = await session.execute(count_stmt)
    if count_result.scalar() > 0:
        workflowUpdate.user_id = user_id
        workflowUpdate.update_time = datetime.now(timezone.utc)
        return await Workflow.update_one(session, workflowUpdate.id, workflowUpdate, exclude_none=True)
    
@transactional()
async def count(user_id: str,session: AsyncSession):
    count_stmt = select(func.count(Workflow.id)).where(Workflow.user_id == user_id,Workflow.is_delete == 0)
    result = await session.execute(count_stmt)
    return result.scalar()

@transactional()
async def create(workflow: Workflow,session: AsyncSession):
    """
    新建工作流
    """
         
    # 加入到会话
    session.add(workflow)       
    # 刷新到数据库，生成主键等
    await session.flush()      
    # 返回 ORM 对象（此时已带 ID）
    return workflow            

@transactional()
async def delete(session: AsyncSession, id: str,user_id: str): 
    """
    删除工作流
    """
    stmt = (
        update(Workflow)
        .where(
            Workflow.id == id,
            Workflow.user_id == user_id,
            Workflow.is_delete == 0,
        )
        .values(
            is_delete=1,
        )
        .returning(Workflow.id)
    )
    res = await session.execute(stmt)
    return res.scalar_one_or_none() is not None

