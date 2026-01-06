from editor.node.base_image_node import BaseImageNode
from typing import override
from typing import Any, AsyncIterator
import httpx
import io
from PIL import Image

class ImageUpscalarNode(BaseImageNode):
   
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self) -> AsyncIterator[Any]:
        super().__init__()
        self.user_prompt = "Describe the content of the image in no more than 300 words."

    @override
    async def input_data(self,model_id: str,params: dict):
        output_height = 0
        output_width = 0
        images = self.get_image(params)
        input_items = []
        for item in images:
            w,h,fmt = await self.get_img_size(item)
            upscale_factor = self.get_upscale_factor(params)
            output_height = max(output_height, h*upscale_factor)
            output_width = max(output_width, w*upscale_factor)  
            input_items.append((item, {"model": model_id,"output_height": output_height,"output_width": output_width}))
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

    async def get_img_size(self,url: str):
        async with httpx.AsyncClient(follow_redirects=True, timeout=20) as c:
            r = await c.get(url)
            r.raise_for_status()
        im = Image.open(io.BytesIO(r.content))
        return im.width, im.height, im.format

image_upscalar_node_instance = ImageUpscalarNode()
