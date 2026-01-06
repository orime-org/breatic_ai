from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime

class WorkflowBase(BaseModel):
    # 禁止额外字段
    model_config = ConfigDict(extra='forbid')
    id: Optional[str] = None
    user_id: Optional[str] = None
    workflow_screen_pic: Optional[str] = None
    workflow_name: Optional[str] = None
    workflow_icon: Optional[str] = None
    workflow_version: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    update_time: Optional[datetime] = None
    remark: Optional[str] = None

class WorkflowUpdate(WorkflowBase):
    pass

class WorkflowUpdateRequest(BaseModel):
    code: int = Field(0, description="状态码")
    data: WorkflowUpdate = Field(WorkflowUpdate(), description="数据")
    update_token: Optional[str] = None

