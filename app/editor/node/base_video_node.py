from editor.node.base_node import BaseNode
from typing import Optional, List,override
from pydantic import BaseModel, ConfigDict

class VideoBasedBlockModel(BaseModel):
    model_config = ConfigDict(extra='forbid')  
    
    source_text: Optional[List[str]] = None
    source_video: Optional[List[str]] = None
    source_image: Optional[List[str]] = None
    source_audio: Optional[List[str]] = None
    upscale_factor: Optional[int] = None
    duration: Optional[int] = None
    resolution: Optional[str] = None
    cut_video_model: Optional[str] = None
    frame_rate: Optional[int] = None
    ratio: Optional[str] = None
    bgm_prompt: Optional[str] = None
    sound_effect_prompt: Optional[str] = None

class BaseVideoNode(BaseNode):
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
    
    def get_ratio(self, params: dict) -> str:
       return params["video_based_blocks"].get("ratio", "16:9")
    
    def get_image(self, params: dict) -> str:
       return params["video_based_blocks"].get("source_image", "")
    
    def get_video(self, params: dict) -> str:
       return params["video_based_blocks"].get("source_video", "")    

    def get_audio(self, params: dict) -> str:
       return params["video_based_blocks"].get("source_audio", "")
    
    def get_user_prompt(self, params: dict) -> str:
       return params["video_based_blocks"].get("source_text", "")

    def get_resolution(self, params: dict) -> str:
       return params["video_based_blocks"].get("resolution", "")
    
    def get_upscale_factor(self, params: dict) -> int:
       return params["video_based_blocks"].get("upscale_factor",2)
   
    def get_duration(self, params: dict) -> str:
       return params["video_based_blocks"].get("duration",4)

    def get_cut_video_model(self, params: dict) -> str:
       return params["video_based_blocks"].get("cut_video_model", "cut_off")
    
    def get_frame_rate(self, params: dict) -> int:
       return params["video_based_blocks"].get("frame_rate",24)

    def get_bgm_prompt(self, params: dict) -> str:
       return params["video_based_blocks"].get("bgm_prompt", "")
    
    def get_sound_effect_prompt(self, params: dict) -> str:
       return params["video_based_blocks"].get("sound_effect_prompt", "")