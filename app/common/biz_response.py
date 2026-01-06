from enum import Enum
from typing import Optional, Generic, TypeVar
from pydantic import BaseModel, Field
from pydantic.generics import GenericModel

T = TypeVar("T")

class BizCode(Enum):
    OK              = (0,     "success")
    UNKNOWN_FAILED   = (10000, "unknown failed")
    OSS_UPLOAD_FAILED   = (10001, "oss upload failed")
    MODEL_REQUEST_FAILED   = (10002, "model request failed")
    MODEL_STATUS_FAILED   = (10003, "model status failed")
    CREDITS_NOT_ENOUGH   = (10004, "credits not enough")
    MODEL_CODE_FAILED   = (10005, "model status failed")
    MODEL_NOT_FOUND   = (10006, "model not found")
    WORKFLOW_COUNT_LIMIT   = (20001, "project count limit")
    
    def __init__(self, code: int, msg: str):
        self._code = code
        self._msg = msg

    @property
    def code(self) -> int:
        return self._code

    @property
    def msg(self) -> str:
        return self._msg

    def __int__(self) -> int:
        return self._code