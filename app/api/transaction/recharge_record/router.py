from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from app.utils.core import get_user_id
from app.locales.translations import get_translation
from datetime import timezone
from app.api.transaction.recharge_record.db import query_user_recharge_record
#叶子节点的blueprint不加url_prefix
recharge_record_router = APIRouter()

@recharge_record_router.post('/recharge_record')
async def operator(
    pageSize: int = Body(...),
    pageNum: int = Body(...),
    rechargeStatus: str = Body(...)
):
    # 获取当前用户ID
    user_id = get_user_id()

    records_result = await query_user_recharge_record(user_id=user_id,page=pageNum,page_size=pageSize,rechargeStatus=rechargeStatus)
    # 转换数据格式以匹配前端期望的格式
    records = []
    for record in records_result["records"]:
        # 根据充值状态设置显示文本（使用数据库原始状态）
        status_map = {
            "completed": get_translation("recharge_success"),
            "created": get_translation("recharge_pending"),
            "failed": get_translation("recharge_failed"),
            "canceled": get_translation("recharge_canceled"),
            "subscribed": get_translation("recharge_subscribed"),
            "renewed": get_translation("recharge_renewed")
        }
        
        recharge_status = record.get("recharge_status", "created")
        status_desc = status_map.get(recharge_status)
        
        # 根据充值类型设置描述
        recharge_type = record.get("recharge_type", "purchase_credits")
        if recharge_type == "membership_subscription":
            membership_level = record.get('recharge_membership_level')
            type_desc_key = f"subscription_membership_level_{membership_level}"
            type_desc = get_translation(type_desc_key)
        else:
            credits = record.get("recharge_credits", 0)
            type_desc = get_translation("purchase_some_credits").format(quantity=f"{credits:,}")
            
        # 处理 datetime 对象转换为字符串
        recharge_time = record.get("recharge_time", "")
        # 确保时间是UTC格式
        if recharge_time.tzinfo is None:
            # 如果没有时区信息，假设为UTC
            recharge_time = recharge_time.replace(tzinfo=timezone.utc)
        recharge_time_str = recharge_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            
        # total_amount = "{:.2f}".format(record.get("recharge_amount", 0))
        recharge_amount = record.get("recharge_amount", 0)
        recharge_amount = float(recharge_amount) if recharge_amount else 0.0
        total_amount = "{:,.2f}".format(recharge_amount)
        total_amount_str = get_translation("total_amount").format(amount=total_amount)
        
        formatted_record = {
            "rechargeTime": recharge_time_str,
            "typeDesc": type_desc,
            "totalAmount": total_amount_str,
            "orderNo": record.get("recharge_token", ""),
            "rechargeStatus": recharge_status,
            "rechargeStatusDesc": status_desc,
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