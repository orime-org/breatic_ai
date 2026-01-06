from app.api.transaction.model.credits_used_history import CreditsUsedHistory
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,func
from app.common.transactional import transactional
from app.utils.db_page import clamp_page

@transactional()
async def query_user_usage_record(page, page_size, user_id,session: AsyncSession) -> dict:
    page,page_size,offset = clamp_page(page=page,page_size=page_size)
  
    stmt = select(CreditsUsedHistory.id,CreditsUsedHistory.used_time,CreditsUsedHistory.used_credits,CreditsUsedHistory.credits_type,CreditsUsedHistory.used_channel,CreditsUsedHistory.used_type,   CreditsUsedHistory.used_token).where(CreditsUsedHistory.user_id == user_id).offset(offset).limit(page_size).order_by(CreditsUsedHistory.used_time.desc())
    count_stmt = select(func.count(CreditsUsedHistory.id)).where(CreditsUsedHistory.user_id == user_id)

    result = await session.execute(stmt)
    count_result = await session.execute(count_stmt)

    records = [{"id": r[0],"used_time":r[1],"used_credits":r[2],"credits_type":r[3],"used_channel":r[4],"used_type":r[5],"used_token":r[6]} for r in result.all()]
    total_count = count_result.scalar()
    total_pages = (total_count + page_size - 1) // page_size

    return {
        "records": records,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }