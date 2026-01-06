from editor.node.base_node import BaseNode
from typing import Optional, List,override
from pydantic import BaseModel, ConfigDict

class TextBasedBlockModel(BaseModel):
    model_config = ConfigDict(extra='forbid')  
    
    source_text: Optional[List[str]] = None
    instruction: Optional[str] = None

class BaseTextNode(BaseNode):
   
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
    
    def get_user_prompt(self, params: dict) -> str:
        return params["text_based_blocks"].get("source_text", "")
    
    def get_instruction(self, params: dict) -> str:
        return params["text_based_blocks"].get("instruction", "")
    
base_text_node_instance = BaseTextNode()    
