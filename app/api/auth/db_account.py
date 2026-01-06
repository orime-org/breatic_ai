from app.api.auth.model.accounts import Account
from app.api.user.model.users import User
from sqlalchemy import select, func, update, and_  
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.transactional import transactional
import logging  
from app.data.membership import get_membership_benefit_item  
from app.api.transaction.model.credits_obtained_history import CreditsObtainedHistory
from app.utils.id_generator import generate_id
from app.utils.time_utils import get_current_time,calculate_next_monthly_update_time
from app.common.redis_concurrency_client import redis_instance

@transactional()
async def find_one_by_user_id(user_id: str,session: AsyncSession):
    """
    根据用户 ID 查询用户账号；未找到则返回 None
    """
    result = await session.execute(
        select(Account).where(Account.user_id == user_id)
    )
    return result.scalar_one_or_none()


@transactional()
async def google_login(user_email: str,user_name: str,avatar: str,session: AsyncSession):    
    # 获取当前时间
    utc_now, beijing_formatted_time, utc_delta = get_current_time(7200)
    # 检查账号表是否已经注册，如果没有注册则先注册
    account_result = await session.execute(
        select(Account).where(Account.email == user_email)
    )
    account  = account_result.scalar_one_or_none()
    
    # 生成token
    token = generate_id()
    if not account:
        account = Account()
        # 创建新账号ID
        account.id = generate_id()

        # 创建新用户ID
        user_id = generate_id()

        account.user_id = user_id
        account.email = user_email
        account.status = "active"
        account.account_type = "google"
        account.verification_code = ""
        account.verify_token = token
        account.code_created_at = utc_now
        account.code_expires_at = utc_now
        account.last_updated_at = utc_now
        account.created_at = utc_now
        account.created_at_str = beijing_formatted_time
        session.add(account)       
        # 刷新到数据库，生成主键等
        await session.flush()  
        await redis_instance.set_key(name=f"token:{token}",value=user_id,ttl_ms=24*60*60*1000)
    else:
        user_id = account.user_id
        if account.verify_token:
            await redis_instance.del_key(name=f"token:{account.verify_token}")
            
        updates = {
            "verify_token": token,
            "last_updated_at": utc_now
        }
        await update_account_fields(filters={"user_id": user_id},updates=updates)
        await redis_instance.set_key(name=f"token:{token}",value=user_id,ttl_ms=30*24*60*60*1000)

    result_user = await session.execute(
        select(User).where(User.id == user_id)
    )
    # 检查用户是否存在
    user = result_user.scalar_one_or_none()
    if not user:            
        await create_user(user_id, user_name, avatar, utc_now, beijing_formatted_time)
    else:
        # 更新用户最后登录时间
        await update_users_fields(
            filters={"id": user_id},
            updates={
                "last_login_at": utc_now,
                "last_updated_at": utc_now,
            }
        )
        
    return token

@transactional()
async def find_one_by_email(email: str,session: AsyncSession):
    """
    根据用户 ID 查询用户账号；未找到则返回 None
    """
    result = await session.execute(
        select(Account).where(Account.email == email)
    )
    return result.scalar_one_or_none()

@transactional()
async def find_one(filters: dict,session: AsyncSession):
    """
    根据条件查询用户账号；未找到则返回 None
    """
    conditions = [getattr(Account, k) == v for k, v in filters.items()]
    result = await session.execute(
        select(Account).where(and_(*conditions))
    )
    return result.scalar_one_or_none()


@transactional()
async def update_users_fields(filters: dict,updates: dict,session: AsyncSession,):
    if not updates or not filters:
        return  # 没有更新或条件，直接返回

    conditions = [getattr(User, k) == v for k, v in filters.items()]

    stmt = (
        update(User)
        .where(and_(*conditions))
        .values(**updates)  # 动态传入更新字段
    )
    await session.execute(stmt)
    await session.flush()


@transactional()
async def update_account_fields(filters: dict,updates: dict,session: AsyncSession,):
    if not updates or not filters:
        return  # 没有更新或条件，直接返回

    conditions = [getattr(Account, k) == v for k, v in filters.items()]

    stmt = (
        update(Account)
        .where(and_(*conditions))
        .values(**updates)  # 动态传入更新字段
    )
    await session.execute(stmt)
    await session.flush()

@transactional()
async def create(account: Account,session: AsyncSession):
    """
    新建用户账号
    """
    # 加入到会话
    session.add(account)       
    # 刷新到数据库，生成主键等
    await session.flush()      
    # 返回 ORM 对象（此时已带 ID）
    return account     

async def create_user_with_transac(user_id,nickname,avatar,utc_now,beijing_formatted_time):
    await create_user(user_id,nickname,avatar,utc_now,beijing_formatted_time)

@transactional()
async def create_user(user_id,nickname,avatar,utc_now,beijing_formatted_time,session: AsyncSession):
    """
    创建用户
    """
    membership_items = get_membership_benefit_item()
    item_benefit = membership_items[0]["benefit"]
    free_credits_amount = item_benefit['free_credits']
    
    user = User()
    user.id = user_id                       
    user.nickname = nickname               
    user.avatar = avatar
    user.subscription_id = ""       
    user.free_credits = free_credits_amount
    user.membership_credits = 0
    user.purchase_credits = 0
    user.project_count_limit = item_benefit["project_count"]
    user.membership_created_at = utc_now
    user.membership_expires_at = utc_now
    user.membership_level = 0
    user.membership_next_month_update_at = utc_now
   
    user.free_next_month_update_at = calculate_next_monthly_update_time(utc_now)
    user.is_first_recharge = True
    user.last_login_at = utc_now
    user.last_updated_at = utc_now
    user.created_at = utc_now
    user.created_at_str = beijing_formatted_time

    session.add(user)       
    await session.flush()  
    
    credits_obtained_history = CreditsObtainedHistory()
    credits_obtained_history.user_id = user_id
    credits_obtained_history.credits_type = "free_credits"
    credits_obtained_history.obtained_time = utc_now
    credits_obtained_history.obtained_credits = free_credits_amount
    session.add(credits_obtained_history)       
    await session.flush()  
