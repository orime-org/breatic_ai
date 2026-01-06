from pickle import INT
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict, List


class WorkflowNodeExecBase(BaseModel):
    # 禁止额外字段
    model_config = ConfigDict(extra='forbid')  
    id: Optional[str] = None
    node_id: Optional[str] = None
    

class WorkflowNodeExecBaseIn(WorkflowNodeExecBase):
    exec_result: Optional[dict] = None

class WorkflowNodeExecBaseDetailIn(WorkflowNodeExecBase):
    result_id: Optional[str] = None
    data: Optional[Any] = None
