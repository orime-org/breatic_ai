from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from app.utils.core import get_user_id
from app.locales.translations import get_translation
from datetime import timezone
from app.api.transaction.usage_record.db import query_user_usage_record
from app.locales.translations import get_node_template_records

#叶子节点的blueprint不加url_prefix
usage_record_router = APIRouter()

@usage_record_router.post('/usage_record')
async def operator(
    pageSize: int = Body(...),
    pageNum: int = Body(...),
):
    # 获取当前用户ID
    user_id = get_user_id()
            
    records_result = await query_user_usage_record(user_id=user_id, page=pageNum, page_size=pageSize)
    # 转换数据格式以匹配前端期望的格式
    records = []
    for record in records_result["records"]:
        # 处理时间格式
        used_time = record.get("used_time", "")
        if used_time.tzinfo is None:
            used_time = used_time.replace(tzinfo=timezone.utc)
        used_time_str = used_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # 根据使用类型设置描述
        used_type = record.get("used_type", "generate_image")

        node_template_records = get_node_template_records()
        node_template_datas = node_template_records["data"]
      
        for data in node_template_datas:
            if data["template_code"] == int(used_type):
                type_desc = data["template_name"]
                break
        else:
            type_desc = used_type
        # type_desc = node_template_records.get(used_type, used_type)
        
        # 根据积分类型设置积分来源描述
        credits_type = record.get("credits_type", "").lower()
        credits_type_map = {
            "free_credits": get_translation("free_credits", "免费积分"),
            "membership_credits": get_translation("membership_credits", "会员积分"),
            "purchase_credits": get_translation("purchase_credits", "购买积分")
        }
        credits_source = credits_type_map.get(credits_type, credits_type)
        # credits_source = get_translation(credits_type)
        
        formatted_record = {
            "usedToken": str(record.get("used_token", "")),
            "usedTime": used_time_str,
            "typeDesc": type_desc,
            "creditsSource": credits_source,
            "quantity": record.get("used_credits", 0)
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