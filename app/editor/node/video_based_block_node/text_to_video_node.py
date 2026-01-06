from editor.node.base_video_node import BaseVideoNode
from typing import override

class TextToVideoNode(BaseVideoNode):
    
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        super().__init__()


    @override
    async def input_data(self,model_id: str,params: dict):
        user_prompt = self.get_user_prompt(params) 
        input_items = []
        for item in user_prompt:
            msg = [{
                "type": "text",
                "text": item 
            }]
            input_items.append((msg, {"model": model_id, "ratio": self.get_ratio(params), "duration": self.get_duration(params)}))
        return {"items": input_items, "total_timeout": 480.0}

    @override
    async def output_data(self,item: dict):
        if item["status"] == "success":
            message = item.pop("message") 
            content = item.pop("content") 
            item.pop("kwargs") 
            source_url = content["data"][0]["url"]
            item["result"] = source_url
            item["source_text"] = message
            item["credits"] = content["credits"]

text_to_video_node_instance = TextToVideoNode()