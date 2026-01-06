from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict, List

class SnapshotTemplateBase(BaseModel):
    # 禁止额外字段
    model_config = ConfigDict(extra='forbid')  
    snapshot_template_name: Optional[str] = None
    snapshot_screen_pic: Optional[str] = None
    node_template_id: Optional[str] = None
    workflow_id: Optional[str] = None
    node_id: Optional[str] = None
    remark: Optional[str] = None
      

class SnapshotTemplateIn(SnapshotTemplateBase):
    details: List[Dict[str, Any]] = Field(default_factory=list)

class SnapshotTemplateUpdateIn(BaseModel):
    id: str = Field(..., gt=0)
    snapshot_template_name: str = Field(..., min_length=1)