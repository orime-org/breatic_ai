from editor.node.base_image_node import BaseImageNode
from typing import override
from typing import Any, AsyncIterator

class ImageDescriberNode(BaseImageNode):
   
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
        images = self.get_image(params)
        user_prompt = self.get_user_prompt(params)
        input_items = []
        for item in images:
            message = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": item
                            },
                        },
                        {"type": "text", "text": user_prompt},
                    ],
                }
            ]
            input_items.append((message, {"model": model_id}))
        return {"items": input_items, "total_timeout": 480.0}

    @override
    async def output_data(self,item: dict):
        if item["status"] == "success": 
            message = item.pop("message") 
            content = item.pop("content") 
            item.pop("kwargs")
            image_url = message[0]["content"][0]["image_url"]
            item["source_image"] = image_url
            item["result"] = content["data"]
            item["credits"] = content["credits"]
         
    def get_user_prompt(self, params: dict) -> str:
        if params.get("instruction", "") == "":
            params["instruction"] = "描述当前图片内容，不多于300字"
        return f"""
        你是一个图片描述器，你的任务是将输入的图片按照用户的需求指令对图片内容进行描述。

        用户需求指令:
           {params.get("instruction", "")}
        
        """
image_describer_node_instance = ImageDescriberNode()