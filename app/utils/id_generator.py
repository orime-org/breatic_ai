from snowflake import SnowflakeGenerator
from uuid6 import uuid7

# 建议进程内单例
snowflake = SnowflakeGenerator(1)  # worker_id = 1

def get_snowflake_id():
    return str(next(snowflake))


def generate_id() -> str:
    return str(uuid7().hex)      