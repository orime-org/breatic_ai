from editor.node.base_text_node import BaseTextNode
from typing import override

class TextToTextNode(BaseTextNode):
   
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
        system_prompt = self.get_system_prompt(params)
        
        input_items = []
        for item in user_prompt:
            if system_prompt:
                input_items.append(([{"role": "system", "content": system_prompt},{"role": "user", "content": item}], {"model": model_id}))
            else:
                input_items.append(([{"role": "user", "content": item}], {"model": model_id}))
        return {"items": input_items, "total_timeout": 480.0}

    @override
    async def output_data(self,item: dict):
        if item["status"] == "success": 
            message = item.pop("message") 
            content = item.pop("content") 
            item.pop("kwargs")
            result = message[0]["content"]
            item["source_text"] = result
            item["result"] = content["data"]
            item["credits"] = content["credits"]
    
    def get_system_prompt(self, params: dict):
        instruction = self.get_instruction(params)
        if instruction and instruction.strip() != "":
            return instruction
        return None
        
text_to_text_node_instance = TextToTextNode()
