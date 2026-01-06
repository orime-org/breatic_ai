from app.api.transaction.model.credits_obtained_history import CreditsObtainedHistory
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,func
from app.common.transactional import transactional
from app.utils.db_page import clamp_page

@transactional()
async def query_user_obtained_record(page: int, page_size: int,user_id: str,session: AsyncSession):
    page,page_size,offset = clamp_page(page=page,page_size=page_size)

    stmt = select(CreditsObtainedHistory.id,CreditsObtainedHistory.credits_type,CreditsObtainedHistory.obtained_credits,CreditsObtainedHistory.obtained_time).where(CreditsObtainedHistory.user_id == user_id).offset(offset).limit(page_size).order_by(CreditsObtainedHistory.obtained_time.desc())
    count_stmt = select(func.count(CreditsObtainedHistory.id)).where(CreditsObtainedHistory.user_id == user_id)

    result = await session.execute(stmt)
    count_result = await session.execute(count_stmt)

    records = [{"id": r[0],"credits_type":r[1],"obtained_credits":r[2],"obtained_time":r[3]} for r in result.all()]
    total_count = count_result.scalar()
    total_pages = (total_count + page_size - 1) // page_size

    return {
        "records": records,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }