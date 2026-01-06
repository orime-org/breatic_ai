from editor.node.base_video_node import BaseVideoNode
from typing import override
from typing import Any, AsyncIterator

class VideoUpscalarNode(BaseVideoNode):
   
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self) -> AsyncIterator[Any]:
        super().__init__()
        self.user_prompt = "Describe the content of the video in no more than 300 words."
    
    @override
    async def input_data(self,model_id: str,params: dict):
        videos = self.get_video(params)
        input_items = []
        for item in videos:
            input_items.append((item, {"model": model_id,"upscale_factor": self.get_upscale_factor(params),"frame_rate": self.get_frame_rate(params)}))
        return {"items": input_items, "total_timeout": 480.0}

    @override
    async def output_data(self,item: dict):
        if item["status"] == "success": 
            message = item.pop("message") 
            content = item.pop("content") 
            item.pop("kwargs")
            item["source_image"] = message
            item["result"] = content["data"]
            item["credits"] = content["credits"]

video_upscalar_node_instance = VideoUpscalarNode()
