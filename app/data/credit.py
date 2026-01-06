from fastapi import HTTPException
from app.utils.core import get_language

def get_credit_items():
    items = CreditItems.get(get_language(), [])
    if not items:
        raise HTTPException(status_code=404)
    return items

CreditItems = {
    "cn":[
        {
            "id": 0,
            "name": "1,000积分",
            "code": "credit_items_0",
            "price": 10,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 1000
        },
        {
            "id": 1,
            "name": "2,000积分",
            "code": "credit_items_1",
            "price": 20,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 2000
        },
        {
            "id": 2,
            "name": "5,000积分",
            "code": "credit_items_2",
            "price": 50,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 5000
        },
        {
            "id": 3,
            "name": "10,000积分",
            "code": "credit_items_3",
            "price": 100,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 10000
        },
        {
            "id": 4,
            "name": "50,000积分",
            "code": "credit_items_4",
            "price": 500,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 50000
        },
        {
            "id": 5,
            "name": "100,000积分",
            "code": "credit_items_5",
            "price": 1000,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 100000
        }
    ],
    "en":[
        {
            "id": 0,
            "name": "1,000 Credits",
            "code": "credit_items_0",
            "price": 10,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 1000
        },
        {
            "id": 1,
            "name": "2,000 Credits",
            "code": "credit_items_1",
            "price": 20,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 2000
        },
        {
            "id": 2,
            "name": "5,000 Credits",
            "code": "credit_items_2",
            "price": 50,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 5000
        },
        {
            "id": 3,
            "name": "10,000 Credits",
            "code": "credit_items_3",
            "price": 100,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 10000
        },
        {
            "id": 4,
            "name": "50,000 Credits",
            "code": "credit_items_4",
            "price": 500,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 50000
        },
        {
            "id": 5,
            "name": "100,000 Credits",
            "code": "credit_items_5",
            "price": 1000,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 100000
        }
    ],
    "tw":[
        {
            "id": 0,
            "name": "1,000積分",
            "code": "credit_items_0",
            "price": 10,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 1000
        },
        {
            "id": 1,
            "name": "2,000積分",
            "code": "credit_items_1",
            "price": 20,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 2000
        },
        {
            "id": 2,
            "name": "5,000積分",
            "code": "credit_items_2",
            "price": 50,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 5000
        },
        {
            "id": 3,
            "name": "10,000積分",
            "code": "credit_items_3",
            "price": 100,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 10000
        },
        {
            "id": 4,
            "name": "50,000積分",
            "code": "credit_items_4",
            "price": 500,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 50000
        },
        {
            "id": 5,
            "name": "100,000積分",
            "code": "credit_items_5",
            "price": 1000,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 100000
        }
    ],
    "ja":[
        {
            "id": 0,
            "name": "1,000ポイント",
            "code": "credit_items_0",
            "price": 10,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 1000
        },
        {
            "id": 1,
            "name": "2,000ポイント",
            "code": "credit_items_1",
            "price": 20,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 2000
        },
        {
            "id": 2,
            "name": "5,000ポイント",
            "code": "credit_items_2",
            "price": 50,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 5000
        },
        {
            "id": 3,
            "name": "10,000ポイント",
            "code": "credit_items_3",
            "price": 100,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 10000
        },
        {
            "id": 4,
            "name": "50,000ポイント",
            "code": "credit_items_4",
            "price": 500,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 50000
        },
        {
            "id": 5,
            "name": "100,000ポイント",
            "code": "credit_items_5",
            "price": 1000,
            "addonType": "credit_items",
            "isFirstRecharge": False,
            "addonValue": 100000
        }
    ],
}
