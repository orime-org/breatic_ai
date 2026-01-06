from editor.node.base_node import BaseNode
from typing import Optional, List, override
from pydantic import BaseModel, ConfigDict


class AudioBasedBlockModel(BaseModel):
    model_config = ConfigDict(extra='forbid')  
    
    source_text: Optional[List[str]] = None
    music_settings: Optional[str] = None
    voice_type: Optional[str] = None   
    duration: Optional[int] = None

class BaseAudioNode(BaseNode):
    """
    基础音频节点
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

    def get_user_prompt(self, params: dict):
        return params["audio_based_blocks"].get("source_text", "")
    
    def get_music_settings(self, params: dict):
        return params["audio_based_blocks"].get("music_settings", "")

    def get_voice_type(self, params: dict):
        return params["audio_based_blocks"].get("voice_type", "") 
    
    def get_instrument(self, params: dict):
        return params["audio_based_blocks"].get("instrumental", True)
    
    def get_duration(self, params: dict):
        return params["audio_based_blocks"].get("duration", "")
