from editor.node.base_audio_node import BaseAudioNode
from typing import override

class TextToAudioNode(BaseAudioNode):
   
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
        input_items = []
        for item in user_prompts:
            input_items.append((item, {"model": model_id,"voice_type": self.get_voice_type(params)}))
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
        
text_to_audio_node_instance = TextToAudioNode()