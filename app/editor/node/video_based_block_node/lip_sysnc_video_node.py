from editor.node.base_video_node import BaseVideoNode
from typing import override
from typing import Any, AsyncIterator

class LipSyncVideoNode(BaseVideoNode):
   
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
            input_items.append((item, {"source_audio": self.get_audio(params)[0], "cut_video_model": self.get_cut_video_model(params)}))
        return {"items": input_items, "total_timeout": 480.0}

    @override
    async def output_data(self,item: dict):
        if item["status"] == "success": 
            message = item.pop("message") 
            content = item.pop("content") 
            item.pop("kwargs")
            source_url = content["data"][0]["url"]
            item["source_image"] = message
            item["result"] = source_url
            item["credits"] = content["credits"]

lip_sync_video_node_instance = LipSyncVideoNode()
