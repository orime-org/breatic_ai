from editor.node.base_image_node import BaseImageNode
from typing import override


class ImageToImageNode(BaseImageNode):
   
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
        images = self.get_image(params)
        input_items = []
        for item in images:
            input_items.append((user_prompt[0], {"model": model_id, "ratio": ratio,"image":item}))
        return {"items": input_items, "total_timeout": 480.0}
    
    @override
    async def output_data(self,item: dict):
        if item["status"] == "success": 
            message = item.pop("message") 
            content = item.pop("content") 
            kwargs = item.pop("kwargs")
            source_url = content["data"][0]["url"]
            item["result"] = source_url
            item["source_text"] = message
            item["source_image"] = kwargs["image"]
            item["credits"] = content["credits"]
       
image_to_image_node_instance = ImageToImageNode()