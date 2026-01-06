from app.api.user.db_users import find_one as user_find_one
from app.api.user.model.users import User

async def get_user_credits_record(user_id: str):
    """
    获取用户当前积分信息
    """
    user: User = await user_find_one(id=user_id)
    free_credits = user.free_credits
    membership_credits = user.membership_credits
    purchase_credits = user.purchase_credits
    return {
        "free_credits": free_credits,
        "membership_credits": membership_credits,
        "purchase_credits": purchase_credits,
        "total_credits": free_credits + membership_credits + purchase_credits
    }
  