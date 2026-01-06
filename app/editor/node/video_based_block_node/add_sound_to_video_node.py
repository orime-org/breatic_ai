from editor.node.base_video_node import BaseVideoNode
from typing import override


class AddSoundToVideoNode(BaseVideoNode):
   
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
        videos = self.get_video(params) 
        input_items = []
        for item in videos:
            input_items.append((user_prompts[0], {"model": model_id,"video_url": item,"bgm_prompt": self.get_bgm_prompt(params)}))
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
        
add_sound_to_video_node_instance = AddSoundToVideoNode()