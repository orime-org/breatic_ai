from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict, List
from app.editor.node.base_text_node import TextBasedBlockModel
from app.editor.node.base_image_node import ImageBasedBlockModel   
from app.editor.node.base_audio_node import AudioBasedBlockModel 
from app.editor.node.base_video_node import VideoBasedBlockModel 


class NodeBase(BaseModel):
    # 禁止额外字段
    model_config = ConfigDict(extra='forbid')  

    id: Optional[str] = None
    flow_id: Optional[str] = None
    template_code: Optional[int] = None
    model_id: Optional[str] = None
    extra_info: Optional[Dict[str, Any]] = None
    
class NodeBaseIn(NodeBase):
    text_based_blocks: Optional[TextBasedBlockModel] = None
    image_based_blocks: Optional[ImageBasedBlockModel] = None
    audio_based_blocks: Optional[AudioBasedBlockModel] = None
    video_based_blocks: Optional[VideoBasedBlockModel] = None
