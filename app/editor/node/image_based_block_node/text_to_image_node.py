from editor.node.base_image_node import BaseImageNode
from typing import override

class TextToImageNode(BaseImageNode):
   
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
        ratio = self.get_ratio(params)
        input_items = []
        for item in user_prompt:
            input_items.append((item, {"model": model_id, "ratio": ratio,}))
        return {"items": input_items, "total_timeout": 480.0}

    @override
    async def output_data(self,item: dict):
        if item["status"] == "success": 
            message = item.pop("message") 
            content = item.pop("content") 
            item.pop("kwargs")
            source_url = content["data"][0]["url"]

            item["result"] =source_url
            item["source_text"] = message
            item["credits"] = content["credits"]
    
text_to_image_node_instance = TextToImageNode()