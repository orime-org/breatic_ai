from typing import Union, Dict, Any
from app.utils.core import get_language
from app.locales.languages.cn import SERVER_CONTENT as cn_content
from app.locales.languages.en import SERVER_CONTENT as en_content
from app.locales.languages.ja import SERVER_CONTENT as ja_content
from app.locales.languages.tw import SERVER_CONTENT as tw_content

# 定义翻译字典，将语言代码映射到对应的翻译内容
translations = {
    "cn": cn_content,
    "en": en_content,
    "ja": ja_content,
    "tw": tw_content
}
        
def get_translation(key: str, default_language=None) -> Union[Dict[str, Any], str]:
    """获取当前请求的翻译对象
    
    Args:
        key: 翻译键名
        
    Returns:
        对应语言的翻译内容
    """
    
    if default_language:
        language = default_language
    else:
        language = get_language()
        
    # 如果请求的语言不存在，默认使用英文
    if language not in translations:
        language = "en"
    
    try:
        # 如果请求的键不存在，返回键名本身
        if key not in translations[language]:
            return key
    except:
        print(f"translation key {key} not found")
        # 如果请求的键不存在，返回键名本身
        return key
    
    return translations[language][key]


def get_stories_list(default_language=None):
    """
    根据当前语言，获取对应的故事列表
    """
    if default_language:
        language = default_language
    else:
        language = get_language()
        
    # 如果请求的语言不存在，默认使用英文
    if language not in stories_list:
        language = "en"
        
    return stories_list[language]()

from app.locales.email_content.cn import get_email_content as get_cn_email_content
from app.locales.email_content.en import get_email_content as get_en_email_content
from app.locales.email_content.ja import get_email_content as get_ja_email_content
from app.locales.email_content.tw import get_email_content as get_tw_email_content

email_content = {
    "cn": get_cn_email_content,
    "en": get_en_email_content,
    "ja": get_ja_email_content,
    "tw": get_tw_email_content
}

def get_email_content(sign_number, default_language=None):
    """
    根据当前语言，获取对应的邮件内容
    """
    if default_language:
        language = default_language
    else:
        language = get_language()
        
    # 如果请求的语言不存在，默认使用英文
    if language not in email_content:
        language = "en"
        
    return email_content[language](sign_number)


def get_project_template_item(default_language=None):
    """
    根据当前语言，获取对应的故事模版
    """
    if default_language:
        language = default_language
    else:
        language = get_language()
        
    # 如果请求的语言不存在，默认使用英文
    if language not in project_template_item:
        language = "en"
        
    return project_template_item[language]()


def get_project_description_item(template_id: str,default_language=None):
    """
    根据当前语言，获取对应的故事模版
    """
    if default_language:
        language = default_language
    else:
        language = get_language()
        
    # 如果请求的语言不存在，默认使用英文
    if language not in project_description_item:
        language = "en"
        
    return project_description_item[language](template_id)


def get_project_role_item(template_id: str,default_language=None):
    """
    根据当前语言，获取对应的故事模版
    """
    if default_language:
        language = default_language
    else:
        language = get_language()
        
    # 如果请求的语言不存在，默认使用英文
    if language not in project_role_item:
        language = "en"
        
    return project_role_item[language](template_id)


def get_project_shot_item(template_id: str,default_language=None):
    """
    根据当前语言，获取对应的故事模版
    """
    if default_language:
        language = default_language
    else:
        language = get_language()
        
    # 如果请求的语言不存在，默认使用英文
    if language not in project_shot_item:
        language = "en"
        
    return project_shot_item[language](template_id)

from app.locales.node_template.cn import records as get_cn_node_template_records
from app.locales.node_template.en import records as get_en_node_template_records
from app.locales.node_template.ja import records as get_ja_node_template_records
from app.locales.node_template.tw import records as get_tw_node_template_records

node_template_records_item = {
    "cn": get_cn_node_template_records,
    "en": get_en_node_template_records,
    "ja": get_ja_node_template_records,
    "tw": get_tw_node_template_records
}

def get_node_template_records(default_language=None):
    if default_language:
        language = default_language
    else:
        language = get_language()
        
    # 如果请求的语言不存在，默认使用英文
    if language not in node_template_records_item:
        language = "en"
        
    return node_template_records_item[language]
    