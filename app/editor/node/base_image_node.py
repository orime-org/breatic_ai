from editor.node.base_node import BaseNode
from typing import Optional, List,override
from pydantic import BaseModel, ConfigDict

class ImageBasedBlockModel(BaseModel):
    model_config = ConfigDict(extra='forbid')  

    style_image: Optional[str] = None
    source_text: Optional[List[str]] = None
    source_image: Optional[List[str]] = None
    upscale_factor: Optional[int] = None
    ratio: Optional[str] = None

class BaseImageNode(BaseNode):
    """
    基础图片节点
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        super().__init__()
    
    @override
    async def exec(self, params: dict):
        pass

    def get_style_image(self, params: dict) -> str:
       return params["image_based_blocks"].get("style_image", "")
    
    def get_ratio(self, params: dict) -> str:
       return params["image_based_blocks"].get("ratio", "")
    
    def get_upscale_factor(self, params: dict) -> int:
       return params["image_based_blocks"].get("upscale_factor",2)
    
    def get_image(self, params: dict) -> str:
       return params["image_based_blocks"].get("source_image", "")
    
    def get_user_prompt(self, params: dict) -> str:
        return params["image_based_blocks"].get("source_text", "")

    