from editor.node.base_text_node import BaseTextNode
from typing import override
import json, re
from app.utils.id_generator import generate_id

class TextSplitterNode(BaseTextNode):
    
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        super().__init__()

    def extract_json_array(self,text: str):
        # 先尝试从 ```json ... ``` 里提取
        m = re.search(r"```(?:json)?\s*(.*?)\s*```", text, flags=re.S|re.I)
        if m:
            text = m.group(1).strip()
        # 如果仍有其它前后噪音，尽量抓第一个 JSON 数组
        n = re.search(r"\[\s*.*\s*\]", text, flags=re.S)
        if n:
            text = n.group(0)
        return json.loads(text)

    @override
    async def input_data(self,model_id: str,params: dict):
        user_prompt = self.get_user_prompt(params) 
        system_prompt = self.get_system_prompt(params)
        input_items = []
        for item in user_prompt:
            input_items.append(([{"role": "system", "content": system_prompt},{"role": "user", "content": item}], {"model": model_id, "response_format": { "type": "json_object" }}))
        return {"items": input_items, "total_timeout": 480.0}

    @override
    async def output_data(self,item: dict):
        if item["status"] == "success": 
  
            item_resuts = []
            message = item.pop("message") 
            content = item.pop("content") 
            item.pop("kwargs")
            result = message[1]["content"]
            item["source_text"] = result
            results = self.extract_json_array(content["data"])
            item_resuts = []
            for result in results:
                item_resuts.append({"id":generate_id(),"data":result})
            item["result"] = item_resuts
            item["credits"] = content["credits"]
        
    def get_system_prompt(self, params: dict) -> str:
        return f"""
        You are a text splitter. Your task is to split the input text according to the user's instruction and return JSON that can be parsed directly.
        You should split the text into multiple parts based on the user's requirements.
        The length of each part must not exceed the specified maximum length.
        You must return a list containing all split parts.
        
        Format requirements (MUST follow):
            - Output ONLY a raw JSON array.
            - Do NOT use Markdown. Do NOT include any backticks (```), explanatory text, or blank lines before/after.
            Example (valid): ["A","B"]
            Example (invalid): ```json\n["A","B"]\n```
            
        Example:
        Input:
        User text: "This is a sample text, used to demonstrate the text splitter."
        User instruction: "Split by ','"

        Output:
        ["This is a sample text", "used to demonstrate the text splitter."]

        User instruction:
           {self.get_instruction(params)}
    
        Output JSON-formatted data:

        """
        
text_splitter_node_instance = TextSplitterNode()