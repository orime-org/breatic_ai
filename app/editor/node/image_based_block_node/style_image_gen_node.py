from editor.node.base_image_node import BaseImageNode
from typing import override
import json

class StyleImageGenNode(BaseImageNode):
   
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
            input_items.append((json.dumps({"gen_image_prompt": item,"style_image_prompt": self.get_style_image(params)}), {"model": model_id, "ratio": ratio,}))
        return {"items": input_items, "total_timeout": 480.0}
    
    @override
    async def output_data(self,item: dict):
        if item["status"] == "success": 
            message = item.pop("message") 
            content = item.pop("content") 
            item.pop("kwargs")
            source_url = content["data"][0]["url"]
            item["result"] = source_url
            message_json = json.loads(message)
            item["source_text"] = message_json["gen_image_prompt"]
            item["credits"] = content["credits"]
    
    def get_system_prompt(self, params: dict) -> str:
        pass
        
style_image_gen_node_instance = StyleImageGenNode()