from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from app.utils.core import get_user_id
from app.locales.translations import get_translation
from datetime import timezone
from app.api.transaction.obtained_record.db import query_user_obtained_record

#叶子节点的blueprint不加url_prefix
obtained_record_router = APIRouter()

@obtained_record_router.post('/obtained_record')
async def operator(
    pageSize: int = Body(...),
    pageNum: int = Body(...),
):
    # 获取当前用户ID
    user_id = get_user_id()
    
    # 转换数据格式以匹配前端期望的格式
    records_result = await query_user_obtained_record(page=pageNum,page_size=pageSize,user_id=user_id)
    records = []
    for record in records_result["records"]:
        # 处理时间格式
        obtained_time = record.get("obtained_time", "")
        if obtained_time.tzinfo is None:
            obtained_time = obtained_time.replace(tzinfo=timezone.utc)
        obtained_time_str = obtained_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # 根据使用类型设置描述
        credits_type = record.get("credits_type", "")
        type_desc = get_translation(credits_type)
                
        formatted_record = {
            "obtainedTime": obtained_time_str,
            "typeDesc": type_desc,
            "quantity": record.get("obtained_credits", 0)
        }
        records.append(formatted_record)
        
    return JSONResponse(content={
        "code": 0,
        "data": {
            "records": records,
            "total": records_result["total"],
            "size": records_result["page_size"],
            "current": records_result["page"],
            "pages": records_result["total_pages"]
        },
        "msg": ""
    })