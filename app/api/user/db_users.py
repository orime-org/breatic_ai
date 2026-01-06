from re import U
from app.api.user.model.users import User
from sqlalchemy import select, func,update,insert, bindparam
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.transactional import transactional
from app.utils.id_generator import generate_id
from app.data.membership import get_membership_benefit_item
from app.api.transaction.model.credits_obtained_history import CreditsObtainedHistory
from app.api.transaction.model.recharge_history import RechargeHistory
from app.api.transaction.model.credits_used_history import CreditsUsedHistory
from app.common.redis_concurrency_client import redis_instance
from app.utils.time_utils import get_current_time,compare_time,calculate_next_monthly_update_time,calculate_next_update_time,calculate_membership_expire_time
import logging

@transactional()
async def calculate_user_credits(user_id,session: AsyncSession):
    """
    计算用户当前积分
    """
    user:User = await find_one(user_id)
    free_credits = user.free_credits
    membership_credits = user.membership_credits
    purchase_credits = user.purchase_credits

    return free_credits + membership_credits + purchase_credits

@transactional()
async def find_one(id: str,session: AsyncSession):
    """
    根据主键 ID 查询用户；未找到则返回 None
    """
    result = await session.execute(
        select(User).where(User.id == id)
    )
    return result.scalar_one_or_none()

#更新用户权益      
@transactional()
async def update_user_benefits(user_id,session: AsyncSession):
        """
        使用分布式锁确保用户权益更新的原子性和并发安全
        需要特殊处理 free_credits为负的情况。
        更新用户的权益并返回当前权益数据
        Returns:
        bool: 是否更新了权益
        """    
        # 最新的用户信息
        user = await find_one(user_id)
        if not user:
            return False   
        # 基于用户数据的智能检查
        current_time, _, _ = get_current_time()
    
        # 更新用户的登录记录
        stmt_upd = (
            update(User)
            .where(User.id == user_id)
            .values(
                last_login_at=current_time
            ).returning(User.id)
        )
        result = await session.execute(stmt_upd)
        await session.flush()
    
        # 检查是否需要更新权益
        needs_update = False
    
        # 检查免费积分是否需要更新
        if compare_time(current_time, user.free_next_month_update_at):
            needs_update = True
    
        # 检查会员积分是否需要更新
        membership_level = user.membership_level if user.membership_level else 0
        if membership_level > 0 and compare_time(current_time, user.membership_next_month_update_at):
            needs_update = True
    
        # 检查会员是否过期
        if membership_level > 0 and compare_time(current_time, user.membership_expires_at):
            needs_update = True
    
        # 只有在需要时才更新
        if not needs_update:
            return
        # 获得锁后，重新查询最新的用户信息
        user:User = await find_one(user_id)
        if not user:
            return False     
        
        membership_items = get_membership_benefit_item()
        membership_level = user.membership_level
        # 获取当前的 free_credits 值
        current_free_credits = user.free_credits
        
        # 检查会员是否过期
        if membership_level > 0 and compare_time(current_time, user.membership_expires_at):
            # 会员过期，重置为免费用户
            item_benefit = membership_items[0]["benefit"]
            stmt_upd = (
                update(User)
                .where(User.id == user_id)
                .values(
                    membership_level=0,
                    project_count_limit=item_benefit['project_count'],
                    last_updated_at=current_time
                ).returning(User.id)
            )
            result = await session.execute(stmt_upd)
            await session.flush()
            membership_level = 0
        
        # 更新免费权益
        if compare_time(current_time, user.free_next_month_update_at):
            next_update_time = calculate_next_monthly_update_time(current_time)
            
            item_benefit = membership_items[0]["benefit"]
            free_credits_amount = item_benefit['free_credits']
                            
            # 如果 free_credits 为负数，则设置为 free_credits + free_credits_amount
            if current_free_credits < 0:
                new_free_credits = current_free_credits + free_credits_amount
            else:
                new_free_credits = free_credits_amount
                
            current_free_credits = new_free_credits
                    
            stmt_upd = (
                update(User)
                .where(User.id == user_id)
                .values(
                    free_credits=new_free_credits,
                    free_next_month_update_at=next_update_time,
                    last_updated_at=current_time
                ).returning(User.id)
            )
            result = await session.execute(stmt_upd)
            await session.flush()
            
            obtained_history = CreditsObtainedHistory(
                user_id=user_id,
                obtained_time=current_time,
                credits_type="free_credits",
                recharge_history_id="free",
                obtained_credits=free_credits_amount
            )
            session.add(obtained_history)
            await session.flush()
          
                
        # 更新会员权益
        if membership_level > 0 and compare_time(current_time, user.membership_next_month_update_at):
            next_update_time = calculate_next_update_time(user.membership_created_at, current_time)
            item_benefit = membership_items[membership_level]["benefit"]
            
            if item_benefit:
                membership_credits_amount = item_benefit["membership_credits"]
                # 如果 free_credits 为负数，需要特殊处理
                if current_free_credits < 0:
                    # free_credits 设置为 free_credits + membership_credits_amount
                    new_free_credits = current_free_credits + membership_credits_amount
                    # membership_credits 设置为 membership_credits_amount + free_credits，但不能小于零
                    new_membership_credits = max(0, membership_credits_amount + current_free_credits)
                    stmt_upd = (
                        update(User)
                        .where(User.id == user_id)
                        .values(
                            free_credits=new_free_credits,
                            membership_credits=func.coalesce(User.membership_credits, 0) + new_membership_credits,
                            membership_next_month_update_at=next_update_time,
                            last_updated_at=current_time
                        ).returning(User.id)
                    )
                    result = await session.execute(stmt_upd)
                    await session.flush()   
                  
                else:
                    stmt_upd = (
                         update(User)
                        .where(User.id == user_id)
                        .values(
                            membership_credits=func.coalesce(User.membership_credits, 0) + membership_credits_amount,
                            membership_next_month_update_at=next_update_time,
                            last_updated_at=current_time
                        ).returning(User.id)
                    )
                    result = await session.execute(stmt_upd)
                    await session.flush()   
                    
                
                # 在 user_transactions 中记录会员积分获取历史
                obtained_history = CreditsObtainedHistory(
                    user_id=user_id,
                    obtained_time=current_time,
                    credits_type="membership_credits",
                    recharge_history_id="membership",
                    obtained_credits=membership_credits_amount,
                )
                session.add(obtained_history)
                await session.flush()
                
        return True


@transactional()
async def handle_purchase_credits(user_id, recharge_credits, current_time,recharge_history_id, session: AsyncSession):
   
        user:User = await find_one(id=user_id)
        if not user:
            return False
            
        # 获取当前用户积分信息
        current_free_credits = user.free_credits
        
        # 如果 free_credits 为负数，需要特殊处理
        if current_free_credits < 0:
            # 计算需要弥补的负债金额
            debt_amount = abs(current_free_credits)
            # free_credits 弥补到0，最多弥补debt_amount
            free_credits_compensation = min(recharge_credits, debt_amount)
            # 剩余的充值积分加到purchase_credits
            remaining_credits = recharge_credits - free_credits_compensation
            stmt = (
                update(User)  # 假设 ORM 模型叫 User
                .where(User.id == user_id)  # 或 User._id
                .values(
                    free_credits = (func.coalesce(User.free_credits, 0) + free_credits_compensation),
                    purchase_credits = (func.coalesce(User.purchase_credits, 0) + remaining_credits),
                    is_first_recharge = False,
                    last_updated_at = current_time,
                )
                .returning(User)  # 需要结果就返回
            )
            res = await session.execute(stmt)
            update_result:User = res.fetchone()
        else:
            stmt = (
                update(User)  # 假设 ORM 模型叫 User
                .where(User.id == user_id)  # 或 User._id
                .values(
                    purchase_credits = (func.coalesce(User.purchase_credits, 0) + recharge_credits),
                    is_first_recharge = False,
                    last_updated_at = current_time,
                )
                .returning(User)  # 需要结果就返回
            )
            res = await session.execute(stmt)
            update_result:User = res.fetchone()
        # 如果更新成功，记录积分获取历史
        if update_result:
            obtained_history = CreditsObtainedHistory(
                user_id=user_id,
                obtained_time=current_time,
                credits_type="purchase_credits",
                recharge_history_id=recharge_history_id,
                obtained_credits=recharge_credits
            )
            session.add(obtained_history)
            await session.flush()
            return True
        
        return False
        
   


@transactional()
async def handle_subscribe_membership(user_id, membership_level, stripe_id, current_time,recharge_history_id, session: AsyncSession):
        """
        用户订阅会员
        """
        # 获得锁后，重新查询最新的用户信息
        user:User = await find_one(id=user_id)
        if not user:
            return None
            
        membership_items = get_membership_benefit_item()
        plan_info = membership_items[membership_level]
        
        # 获取会员权益
        item_benefit = plan_info["benefit"]
        month_count = item_benefit.get("month_count", 1)
        # 计算会员到期时间
        expire_time = calculate_membership_expire_time(current_time, month_count)
        
        membership_credits_amount = item_benefit.get("membership_credits", 0)
        project_count_limit = item_benefit.get("project_count", 10)
        
        # 获取当前用户积分信息
        current_free_credits = user.free_credits
        
        # 如果 free_credits 为负数，需要特殊处理
        if current_free_credits < 0:
            # 计算需要弥补的负债金额
            debt_amount = abs(current_free_credits)
            # free_credits 弥补到0，最多弥补debt_amount
            free_credits_compensation = min(membership_credits_amount, debt_amount)
            # 剩余的会员积分加到membership_credits
            remaining_credits = membership_credits_amount - free_credits_compensation
            stmt = (
                update(User)  # 假设 ORM 模型叫 User
                .where(User.id == user_id)  # 或 User._id
                .values(
                    free_credits = (func.coalesce(User.free_credits, 0) + free_credits_compensation),
                    membership_credits = (func.coalesce(User.membership_credits, 0) + remaining_credits),
                    subscription_id = stripe_id,
                    membership_level = membership_level,
                    membership_expires_at = expire_time,
                    membership_created_at = current_time,
                    membership_next_month_update_at = calculate_next_update_time(current_time, current_time),
                    project_count_limit = project_count_limit,
                    last_updated_at = current_time,
                )
                .returning(User)  # 需要结果就返回
            )
            res = await session.execute(stmt)
            update_result:User = res.fetchone()
        else:
            stmt = (
                update(User)                       # ORM 模型：User
                .where(User.id == user_id)         # 如果列名是 _id，就改成 User._id == user_id
                .values(
    
                    subscription_id=stripe_id,
                    membership_level=membership_level,
                    membership_expires_at=expire_time,
                    membership_created_at=current_time,
                    membership_next_month_update_at=calculate_next_update_time(current_time, current_time),
                    project_count_limit=project_count_limit,
                    last_updated_at=current_time,
                    membership_credits=func.coalesce(User.membership_credits, 0) + membership_credits_amount,
                )
                .returning(
                    User.id,
                    User.membership_level,
                    User.membership_credits,
                    User.membership_expires_at,
                    User.project_count_limit,
                    User.last_updated_at,
                )
            )
            res = await session.execute(stmt)
            update_result:User = res.fetchone()
        
        # 如果更新成功，记录会员积分获取历史
        if update_result and membership_credits_amount > 0:
            obtained_history = CreditsObtainedHistory(
                user_id=user_id,
                obtained_time=current_time,
                credits_type="membership_credits",
                recharge_history_id=recharge_history_id,
                obtained_credits=membership_credits_amount
            )
            session.add(obtained_history)
            await session.flush()
        
        return expire_time if update_result else None

@transactional()
async def handle_subscription_renewal(current_time,subscription: dict, session: AsyncSession) -> bool:
    """
    处理订阅续费事件 (BILLING.SUBSCRIPTION.UPDATED)
    """
    subscription_id = subscription.get("id")  # 订阅ID
    
    if not subscription_id:
        logging.error(f"Subscription ID is missing in the event: {subscription}")
        return False
    
    subscription_status = subscription.get("status")
    
    # 只处理活跃状态的订阅
    if subscription_status != "active":
        logging.info(f"Subscription status is {subscription_status}, not processing as renewal")
        return False
    
    logging.info(f"Processing subscription renewal for subscription_id: {subscription_id}, status: {subscription_status}")
    
    try:
        user_result = await session.execute(
            select(User).where(User.subscription_id == subscription_id)
        )
        user:User = user_result.scalar_one_or_none()
        
        if not user:
            logging.error(f"User not found for subscription_id: {subscription_id}")
            return False
        
        user_id = user.id
        
        # 判断是否为续订
        current_created_at = user.membership_created_at
        current_expires_at = user.membership_expires_at
        
        #当第一次订阅的时间 会让 current_expires_at 与 current_created_at 不同。并且 续订的时间 一定小于当前时间
        is_renewal = current_expires_at > current_created_at and current_expires_at > current_time
        
        if not is_renewal:
            logging.info(f"Subscription is not a renewal for user {user_id}")            
            return False
                
        # 获取会员等级
        membership_level = user.membership_level
        
        if membership_level is None:
            logging.error(f"Unable to determine membership level for subscription {subscription_id}")
            return False
            
        # 获取会员权益
        membership_benefits = get_membership_benefit_item()
        
        # 找到对应等级的权益
        item_benefit = None
        plan_info = None
        for item in membership_benefits:
            if item["id"] == membership_level:
                item_benefit = item["benefit"]
                plan_info = item
                break
                
        if not item_benefit:
            logging.error(f"Membership benefit not found for level {membership_level}")
            return False
                                    
        # 计算会员到期时间
        month_count = item_benefit.get("month_count", 1)
        new_expires_at = calculate_membership_expire_time(current_expires_at, month_count)
        
        #生成一个客户端自己的ID
        # token = mongo_instance.generate_token()
        token = generate_id()
        recharge_history = RechargeHistory(
            user_id=user_id,
            recharge_time=current_time,
            recharge_type="membership_subscription",
            recharge_channel="stripe",
            recharge_remote_id=subscription_id,
            recharge_amount=float(plan_info.get('price', 0)),
            recharge_item_id=int(membership_level),
            recharge_membership_level=int(membership_level),
            recharge_token=token,
            recharge_status="renewed",
            update_time=current_time
        )
        session.add(recharge_history)
        await session.flush()
       
        stmt = (
            update(User)                       # ORM 模型：User
            .where(User.id == user_id)         # 如果列名是 _id，就改成 User._id == user_id
            .values(
                    membership_level=membership_level,
                    membership_expires_at=new_expires_at,
                    last_updated_at=current_time,
                )
                .returning(
                    User.id,
                    User.membership_level,
                    User.membership_credits,
                    User.membership_expires_at,
                    User.project_count_limit,
                    User.last_updated_at,
                )
        )
        await session.execute(stmt)
        
        return True
            
    except Exception as e:
        logging.error(f"Error processing subscription renewal: {str(e)}", exc_info=True)
        return False

@transactional()
async def deduct_user_credits(used_channel, user_id, used_type, used_token, used_credits,session: AsyncSession) -> bool:
        """
        使用分布式锁确保积分扣除的原子性和并发安全
        扣除积分并记录使用历史
        1. 如果total_credits <= 0，返回False
        2. 如果足够扣除，按照free_credits -> membership_credits -> purchase_credits顺序依次扣除
        3. 如果不足够扣除，按照membership_credits -> purchase_credits -> free_credits顺序扣除，确保free_credits只有一条扣除记录
        """
   

        # current_time, _, _ = mongo_instance.get_current_time()
        current_time, _, _ = get_current_time()
        # 获得锁后，重新查询最新的用户积分
        user_result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user:User = user_result.scalar_one_or_none()
        if not user:
            return False
            
        free_credits = user.free_credits
        membership_credits = user.membership_credits
        purchase_credits = user.purchase_credits
        total_credits = free_credits + membership_credits + purchase_credits
        
        # 如果总积分小于等于零，返回False
        if total_credits <= 0:
            return False
        
        # 计算各类积分的扣除量
        remaining_amount = used_credits
        free_deduct = 0
        membership_deduct = 0
        purchase_deduct = 0
        usage_records = []
        
        # 积分扣除策略计算
        if total_credits >= used_credits:
            # 足够扣除：free_credits -> membership_credits -> purchase_credits
            if remaining_amount > 0 and free_credits > 0:
                free_deduct = min(remaining_amount, free_credits)
                remaining_amount -= free_deduct
                if free_deduct > 0:
                    usage_records.append({
                        "used_time": current_time,
                        "credits_type": "free_credits",
                        "user_id": user_id,
                        "used_channel": used_channel,
                        "used_type": used_type,
                        "used_credits": free_deduct,
                        "used_token": used_token
                    })
            
            if remaining_amount > 0 and membership_credits > 0:
                membership_deduct = min(remaining_amount, membership_credits)
                remaining_amount -= membership_deduct
                if membership_deduct > 0:
                    usage_records.append({
                        "used_time": current_time,
                        "credits_type": "membership_credits",
                        "user_id": user_id,
                        "used_channel": used_channel,
                        "used_type": used_type,
                        "used_credits": membership_deduct,
                        "used_token": used_token
                    })
            
            if remaining_amount > 0 and purchase_credits > 0:
                purchase_deduct = min(remaining_amount, purchase_credits)
                remaining_amount -= purchase_deduct
                if purchase_deduct > 0:
                    usage_records.append({
                        "used_time": current_time,
                        "credits_type": "purchase_credits",
                        "user_id": user_id,
                        "used_channel": used_channel,
                        "used_type": used_type,
                        "used_credits": purchase_deduct,
                        "used_token": used_token
                    })
        else:
            # 不足扣除：membership_credits -> purchase_credits -> free_credits
            if remaining_amount > 0 and membership_credits > 0:
                membership_deduct = min(remaining_amount, membership_credits)
                remaining_amount -= membership_deduct
                if membership_deduct > 0:
                    usage_records.append({
                        "used_time": current_time,
                        "credits_type": "membership_credits",
                        "user_id": user_id,
                        "used_channel": used_channel,
                        "used_type": used_type,
                        "used_credits": membership_deduct,
                        "used_token": used_token
                    })
            
            if remaining_amount > 0 and purchase_credits > 0:
                purchase_deduct = min(remaining_amount, purchase_credits)
                remaining_amount -= purchase_deduct
                if purchase_deduct > 0:
                    usage_records.append({
                        "used_time": current_time,
                        "credits_type": "purchase_credits",
                        "user_id": user_id,
                        "used_channel": used_channel,
                        "used_type": used_type,
                        "used_credits": purchase_deduct,
                        "used_token": used_token
                    })
            
            # 剩余部分从 free_credits 扣除（可以为负数）
            if remaining_amount > 0:
                free_deduct = remaining_amount
                usage_records.append({
                    "used_time": current_time,
                    "user_id": user_id,
                    "credits_type": "free_credits",
                    "used_channel": used_channel,
                    "used_type": used_type,
                    "used_credits": free_deduct,
                    "used_token": used_token
                })
        
       
        stmt = (update(User).where(User.id == user_id)
            .values(
                free_credits=User.free_credits - bindparam("free_deduct"),
                membership_credits=User.membership_credits - bindparam("membership_deduct"),
                purchase_credits=User.purchase_credits - bindparam("purchase_deduct"),
                last_updated_at=current_time,
            ).returning(User.id,)
        )
        user_res = await session.execute(stmt,
            {
                "free_deduct": free_deduct,
                "membership_deduct": membership_deduct,
                "purchase_deduct": purchase_deduct,
            },
        )
        user_row = user_res.mappings().one_or_none()
        # 如果更新成功，记录交易历史
        if user_row:
             
            stmt = (insert(CreditsUsedHistory).values(usage_records).returning(CreditsUsedHistory.id))
            await session.execute(stmt)
            return True
        
        return False