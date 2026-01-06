#用户的会员权益
from fastapi import HTTPException
from app.utils.core import get_language

def get_membership_benefit_item():
    item = MembershipBenefit.get(get_language(),[])
    if not item:
        raise HTTPException(status_code=404)
    return item

MembershipBenefit = {
    "cn":[
            {
                "id": 0,
                "name": "免费用户",
                "code": "membership_items_0",
                "icon": "Zap",
                "price": "0",
                "strikePrice": "0",
                "cycle": "MONTHLY",
                "features": [
                    "每月获得100点免费积分，自然月重置"
                ],
                "benefit": {
                    "price": 0,
                    "strikePrice": 0,
                    "month_count":0,
                    "project_count": 10,
                    "free_credits": 100,
                },
                "description": "免费"
            },
            {
                "id": 1,
                "name": "月普通会员",
                "code": "membership_items_1",
                "icon": "Layers2",
                "price": "19.99",
                "strikePrice": "58",
                "cycle": "MONTHLY",
                "features": [
                    "每月获得100点免费积分，自然月重置",
                    "每月获得2,500点会员积分，按月累计",
                    "获得1个月的会员权益"
                ],
                "benefit": {
                    "price": 19.99,
                    "strikePrice": 58,
                    "month_count":1,
                    "project_count": 50,
                    "free_credits": 100,
                    "membership_credits": 2500,
                },
                "description": "每人/每月"
            },
            {
                "id": 2,
                "name": "月高级会员",
                "code": "membership_items_2",
                "icon": "Layers",
                "price": "29.99",
                "strikePrice": "98",
                "cycle": "MONTHLY",
                "features": [
                    "每月获得100点免费积分，自然月重置",
                    "每月获得4,000点会员积分，按月累计",
                    "获得1个月的会员权益"
                ],
                "benefit": {
                    "price": 29.99,
                    "strikePrice": 98,
                    "month_count":1,
                    "project_count": 200,
                    "free_credits": 100,
                    "membership_credits": 4000,
                },
                "description": "每人/每月"
            },
            {
                "id": 3,
                "name": "免费用户",
                "code": "membership_items_3",
                "icon": "Zap",
                "price": "0",
                "strikePrice": "0",
                "cycle": "ANNUAL",
                "features": [
                    "每月获得100点免费积分，自然月重置"
                ],
                "benefit": {
                    "price": 0,
                    "strikePrice": 0,
                    "month_count":0,
                    "project_count": 10,
                    "free_credits": 100,
                },
                "description": "免费"
            },
            {
                "id": 4,
                "name": "年普通会员",
                "code": "membership_items_4",
                "icon": "Layers2",
                "price": "199.99",
                "strikePrice": "598",
                "cycle": "ANNUAL",
                "features": [
                    "每月获得100点免费积分，自然月重置",
                    "每月获得2,500点会员积分，按月累计",
                    "获得12个月的会员权益"
                ],
                "benefit": {
                    "price": 199.99,
                    "strikePrice": 598,
                    "month_count": 12,
                    "project_count": 50,
                    "free_credits": 100,
                    "membership_credits": 2500,
                },
                "description": "每人/每年"
            },
            {
                "id": 5,
                "name": "年高级会员",
                "code": "membership_items_5",
                "icon": "Layers",
                "price": "299.99",
                "strikePrice": "998",
                "cycle": "ANNUAL",
                "features": [
                    "每月获得100点免费积分，自然月重置",
                    "每月获得4,000点会员积分，按月累计",
                    "获得14个月的会员权益"
                ],
                "benefit": {
                    "price": 299.99,
                    "strikePrice": 998,
                    "month_count": 14,
                    "project_count": 200,
                    "free_credits": 100,
                    "membership_credits": 4000,
                },
                "description": "每人/每年"
            },
        ],

    "en": [
        {
            "id": 0,
            "name": "Free User",
            "code": "membership_items_0",
            "icon": "Zap",
            "price": "0",
            "strikePrice": "0",
            "cycle": "MONTHLY",
            "features": [
                "100 free credits per month, reset monthly"
            ],
            "benefit": {
                "price": 0,
                "strikePrice": 0,
                "month_count": 0,
                "project_count": 10,
                "free_credits": 100
            },
            "description": "Free"
        },
        {
            "id": 1,
            "name": "Monthly Standard Member",
            "code": "membership_items_1",
            "icon": "Layers2",
            "price": "19.99",
            "strikePrice": "58",
            "cycle": "MONTHLY",
            "features": [
                "100 free credits per month, reset monthly",
                "2,500 membership credits per month, accumulated monthly",
                "Get one month of membership benefits"
            ],
            "benefit": {
                "price": 19.99,
                "strikePrice": 58,
                "month_count": 1,
                "project_count": 50,
                "free_credits": 100,
                "membership_credits": 2500
            },
            "description": "Per person/month"
        },
        {
            "id": 2,
            "name": "Monthly Premium Member",
            "code": "membership_items_2",
            "icon": "Layers",
            "price": "29.99",
            "strikePrice": "98",
            "cycle": "MONTHLY",
            "features": [
                "100 free credits per month, reset monthly",
                "4,000 membership credits per month, accumulated monthly",
                "Get one month of membership benefits"
            ],
            "benefit": {
                "price": 29.99,
                "strikePrice": 98,
                "month_count": 1,
                "project_count": 200,
                "free_credits": 100,
                "membership_credits": 4000
            },
            "description": "Per person/month"
        },
        {
            "id": 3,
            "name": "Free User",
            "code": "membership_items_3",
            "icon": "Zap",
            "price": "0",
            "strikePrice": "0",
            "cycle": "ANNUAL",
            "features": [
                "100 free credits per month, reset monthly"
            ],
            "benefit": {
                "price": 0,
                "strikePrice": 0,
                "month_count": 0,
                "project_count": 10,
                "free_credits": 100
            },
            "description": "Free"
        },
        {
            "id": 4,
            "name": "Annual Standard Member",
            "code": "membership_items_4",
            "icon": "Layers2",
            "price": "199.99",
            "strikePrice": "598",
            "cycle": "ANNUAL",
            "features": [
                "100 free credits per month, reset monthly",
                "2,500 membership credits per month, accumulated monthly",
                "Get 12 months of membership benefits"
            ],
            "benefit": {
                "price": 199.99,
                "strikePrice": 598,
                "month_count": 12,
                "project_count": 50,
                "free_credits": 100,
                "membership_credits": 2500
            },
            "description": "Per person/year"
        },
        {
            "id": 5,
            "name": "Annual Premium Member",
            "code": "membership_items_5",
            "icon": "Layers",
            "price": "299.99",
            "strikePrice": "998",
            "cycle": "ANNUAL",
            "features": [
                "100 free credits per month, reset monthly",
                "4,000 membership credits per month, accumulated monthly",
                "Get 14 months of membership benefits"
            ],
            "benefit": {
                "price": 299.99,
                "strikePrice": 998,
                "month_count": 14,
                "project_count": 200,
                "free_credits": 100,
                "membership_credits": 4000
            },
            "description": "Per person/year"
        }
    ],
    
    "tw": [
        {
            "id": 0,
            "name": "免費用戶",
            "code": "membership_items_0",
            "icon": "Zap",
            "price": "0",
            "strikePrice": "0",
            "cycle": "MONTHLY",
            "features": [
                "每月獲得100點免費積分，自然月重置"
            ],
            "benefit": {
                "price": 0,
                "strikePrice": 0,
                "month_count": 0,
                "project_count": 10,
                "free_credits": 100
            },
            "description": "免費"
        },
        {
            "id": 1,
            "name": "月普通會員",
            "code": "membership_items_1",
            "icon": "Layers2",
            "price": "19.99",
            "strikePrice": "58",
            "cycle": "MONTHLY",
            "features": [
                "每月獲得100點免費積分，自然月重置",
                "每月獲得2,500點會員積分，按月累計",
                "獲得1個月的會員權益"
            ],
            "benefit": {
                "price": 19.99,
                "strikePrice": 58,
                "month_count": 1,
                "project_count": 50,
                "free_credits": 100,
                "membership_credits": 2500
            },
            "description": "每人/每月"
        },
        {
            "id": 2,
            "name": "月高級會員",
            "code": "membership_items_2",
            "icon": "Layers",
            "price": "29.99",
            "strikePrice": "98",
            "cycle": "MONTHLY",
            "features": [
                "每月獲得100點免費積分，自然月重置",
                "每月獲得4,000點會員積分，按月累計",
                "獲得1個月的會員權益"
            ],
            "benefit": {
                "price": 29.99,
                "strikePrice": 98,
                "month_count": 1,
                "project_count": 200,
                "free_credits": 100,
                "membership_credits": 4000
            },
            "description": "每人/每月"
        },
        {
            "id": 3,
            "name": "免費用戶",
            "code": "membership_items_3",
            "icon": "Zap",
            "price": "0",
            "strikePrice": "0",
            "cycle": "ANNUAL",
            "features": [
                "每月獲得100點免費積分，自然月重置"
            ],
            "benefit": {
                "price": 0,
                "strikePrice": 0,
                "month_count": 0,
                "project_count": 10,
                "free_credits": 100
            },
            "description": "免費"
        },
        {
            "id": 4,
            "name": "年普通會員",
            "code": "membership_items_4",
            "icon": "Layers2",
            "price": "199.99",
            "strikePrice": "598",
            "cycle": "ANNUAL",
            "features": [
                "每月獲得100點免費積分，自然月重置",
                "每月獲得2,500點會員積分，按月累計",
                "獲得12個月的會員權益"
            ],
            "benefit": {
                "price": 199.99,
                "strikePrice": 598,
                "month_count": 12,
                "project_count": 50,
                "free_credits": 100,
                "membership_credits": 2500
            },
            "description": "每人/每年"
        },
        {
            "id": 5,
            "name": "年高級會員",
            "code": "membership_items_5",
            "icon": "Layers",
            "price": "299.99",
            "strikePrice": "998",
            "cycle": "ANNUAL",
            "features": [
                "每月獲得100點免費積分，自然月重置",
                "每月獲得4,000點會員積分，按月累計",
                "獲得14個月的會員權益"
            ],
            "benefit": {
                "price": 299.99,
                "strikePrice": 998,
                "month_count": 14,
                "project_count": 200,
                "free_credits": 100,
                "membership_credits": 4000
            },
            "description": "每人/每年"
        }
    ],
    
    "ja": [
        {
            "id": 0,
            "name": "無料ユーザー",
            "code": "membership_items_0",
            "icon": "Zap",
            "price": "0",
            "strikePrice": "0",
            "cycle": "MONTHLY",
            "features": [
                "毎月100ポイントの無料クレジット、月ごとにリセット"
            ],
            "benefit": {
                "price": 0,
                "strikePrice": 0,
                "month_count": 0,
                "project_count": 10,
                "free_credits": 100
            },
            "description": "無料"
        },
        {
            "id": 1,
            "name": "月間スタンダード会員",
            "code": "membership_items_1",
            "icon": "Layers2",
            "price": "19.99",
            "strikePrice": "58",
            "cycle": "MONTHLY",
            "features": [
                "毎月100ポイントの無料クレジット、月ごとにリセット",
                "毎月2,500ポイントの会員クレジット、月ごとに累積",
                "1ヶ月分の会員特典を獲得"
            ],
            "benefit": {
                "price": 19.99,
                "strikePrice": 58,
                "month_count": 1,
                "project_count": 50,
                "free_credits": 100,
                "membership_credits": 2500
            },
            "description": "1人/月"
        },
        {
            "id": 2,
            "name": "月間プレミアム会員",
            "code": "membership_items_2",
            "icon": "Layers",
            "price": "29.99",
            "strikePrice": "98",
            "cycle": "MONTHLY",
            "features": [
                "毎月100ポイントの無料クレジット、月ごとにリセット",
                "毎月4,000ポイントの会員クレジット、月ごとに累積",
                "1ヶ月分の会員特典を獲得"
            ],
            "benefit": {
                "price": 29.99,
                "strikePrice": 98,
                "month_count": 1,
                "project_count": 200,
                "free_credits": 100,
                "membership_credits": 4000
            },
            "description": "1人/月"
        },
        {
            "id": 3,
            "name": "無料ユーザー",
            "code": "membership_items_3",
            "icon": "Zap",
            "price": "0",
            "strikePrice": "0",
            "cycle": "ANNUAL",
            "features": [
                "毎月100ポイントの無料クレジット、月ごとにリセット"
            ],
            "benefit": {
                "price": 0,
                "strikePrice": 0,
                "month_count": 0,
                "project_count": 10,
                "free_credits": 100
            },
            "description": "無料"
        },
        {
            "id": 4,
            "name": "年間スタンダード会員",
            "code": "membership_items_4",
            "icon": "Layers2",
            "price": "199.99",
            "strikePrice": "598",
            "cycle": "ANNUAL",
            "features": [
                "毎月100ポイントの無料クレジット、月ごとにリセット",
                "毎月2,500ポイントの会員クレジット、月ごとに累積",
                "12ヶ月分の会員特典を獲得"
            ],
            "benefit": {
                "price": 199.99,
                "strikePrice": 598,
                "month_count": 12,
                "project_count": 50,
                "free_credits": 100,
                "membership_credits": 2500
            },
            "description": "1人/年"
        },
        {
            "id": 5,
            "name": "年間プレミアム会員",
            "code": "membership_items_5",
            "icon": "Layers",
            "price": "299.99",
            "strikePrice": "998",
            "cycle": "ANNUAL",
            "features": [
                "毎月100ポイントの無料クレジット、月ごとにリセット",
                "毎月4,000ポイントの会員クレジット、月ごとに累積",
                "14ヶ月分の会員特典を獲得"
            ],
            "benefit": {
                "price": 299.99,
                "strikePrice": 998,
                "month_count": 14,
                "project_count": 200,
                "free_credits": 100,
                "membership_credits": 4000
            },
            "description": "1人/年"
        }
    ]
}