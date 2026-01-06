import uuid,calendar,os,logging
from typing import Optional, Dict, List, Union
from datetime import datetime,timezone,timedelta

def compare_time(current_time,database_time) -> bool:
    """
    比较两个时间戳，返回True表示current_time大于database_time
    """  
    if not database_time:
        database_time = 0

    if database_time and not database_time.tzinfo:
        database_time = database_time.replace(tzinfo=timezone.utc)
        
    # print(f"current_time: {current_time} database_time: {database_time}")
        
    return current_time >= database_time

def get_current_time(delta=0) -> tuple:
        """
        获取当前时间，支持时间偏移，返回UTC时间、北京时间字符串和偏移后的UTC时间
        
        Args:
            delta: 时间偏移量，单位为秒，默认为0。正数表示未来时间，负数表示过去时间
            
        Returns:
            tuple: 包含三个元素:
                - datetime: UTC当前时间，带时区信息
                - str: 北京时间格式化字符串，格式为 "YYYY-MM-DD HH:MM:SS GMT+8"
                - datetime: 偏移后的UTC时间，带时区信息
        """
        utc_now = datetime.now(timezone.utc)
        # 计算偏移后的时间
        utc_delta = utc_now + timedelta(seconds=delta)
        # 转换为北京时间
        beijing_timezone = timezone(timedelta(hours=8))
        beijing_now = utc_now.astimezone(beijing_timezone)
        # 格式化时间为北京时间字符串
        beijing_formatted_time = beijing_now.strftime("%Y-%m-%d %H:%M:%S GMT+8")
        
        return utc_now, beijing_formatted_time, utc_delta

def calculate_next_monthly_update_time(current_time: datetime) -> datetime:
        """
        为免费用户计算下次更新时间
        更新时间固定为下个月的第一天 00:00:00
        例如: 
        - 1月5日创建，下次更新时间为2月1日 00:00:00
        - 1月31日创建，下次更新时间为2月1日 00:00:00
        """
        # 计算下个月的年和月
        next_year = current_time.year
        next_month = current_time.month + 1
        
        if next_month > 12:
            next_month = 1
            next_year += 1
        
        # 创建下次更新时间，固定为下个月1号的00:00:00
        next_update_time = datetime(
            next_year,
            next_month,
            1,  # 固定为每月1号
            0,  # 小时设为0
            0,  # 分钟设为0
            0,  # 秒设为0
            tzinfo=current_time.tzinfo
        )
        
        return next_update_time

def calculate_next_update_time(create_time: datetime, current_time: datetime) -> datetime:
        """
        基于创建时间计算下次更新时间
        保持与创建时间相同的时分秒
        例如: 
        - 1月31日 12:30:45创建，2月会在28日 12:30:45更新，3月会在31日 12:30:45更新
        """
        # 获取创建时间的具体时间部分
        create_day = create_time.day
        create_hour = create_time.hour
        create_minute = create_time.minute
        create_second = create_time.second  # 保持原始秒数
        
        # 计算下个月的年和月
        next_year = current_time.year
        next_month = current_time.month + 1
        
        if next_month > 12:
            next_month = 1
            next_year += 1
        
        # 获取下个月的最后一天
        _, last_day_of_next_month = calendar.monthrange(next_year, next_month)
        
        # 如果创建日期大于下个月的最后一天，使用下个月的最后一天
        # 否则使用创建时的日期
        next_day = min(create_day, last_day_of_next_month)
        
        # 创建下次更新时间，保持原始的时分秒
        next_update_time = datetime(
            next_year,
            next_month,
            next_day,
            create_hour,
            create_minute,
            create_second,
            tzinfo=current_time.tzinfo
        )
        
        return next_update_time


def calculate_membership_expire_time(start_time,month_count: int):
        """
        基于创建时间和月数计算到期时间
        例如: 
        - 1月31日 12:30:45创建，1个月后到期时间为2月28日 12:30:44
        - 1月31日 12:30:45创建，3个月后到期时间为4月30日 12:30:44
        """
        # 计算到期时间
        # 获取当前年月日时分秒
        year = start_time.year
        month = start_time.month
        day = start_time.day
        hour = start_time.hour
        minute = start_time.minute
        second = start_time.second
        
        # 计算目标月份
        target_month = month + month_count
        target_year = year
        
        # 处理跨年情况
        while target_month > 12:
            target_month -= 12
            target_year += 1
        
        # 处理月末日期问题（如1月31日+1个月应该是2月28日或29日）
        import calendar
        max_day = calendar.monthrange(target_year, target_month)[1]
        target_day = min(day, max_day)
        
        # 创建目标日期时间
        expire_time = datetime(
            target_year, 
            target_month, 
            target_day, 
            hour, 
            minute, 
            second, 
            tzinfo=start_time.tzinfo
        )
        
        # expire_time = expire_time - timedelta(seconds=1)
        return expire_time