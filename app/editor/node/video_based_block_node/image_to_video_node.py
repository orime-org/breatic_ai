from editor.node.base_video_node import BaseVideoNode
from typing import override

class ImageToVideoNode(BaseVideoNode):
    """
    图片转视频节点
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        super().__init__()

    @override
    async def input_data(self,model_id: str,params: dict):
        user_prompts = self.get_user_prompt(params) 
        images = self.get_image(params) 
        input_items = []
        for item in images:
            msg = [{
                "type": "text",
                "text": user_prompts[0] 
            },{
                "type": "image_url",
                "image_url": {
                    "url": item 
                } 
            }]
            input_items.append((msg, {"model": model_id, "ratio": self.get_ratio(params), "duration": self.get_duration(params), "resolution": self.get_resolution(params)}))
        return {"items": input_items, "total_timeout": 480.0}

    @override
    async def output_data(self,item: dict):
        if item["status"] == "success":
            message = item.pop("message") 
            content = item.pop("content") 
            item.pop("kwargs") 
            source_url = content["data"][0]["url"]
            item["result"] = source_url
            item["source_text"] = message[0]["text"]
            item["source_image"] = message[1]["image_url"]
            item["credits"] = content["credits"]

image_to_video_node_instance = ImageToVideoNode()