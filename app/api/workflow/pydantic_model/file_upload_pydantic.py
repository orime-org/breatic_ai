from pydantic import BaseModel, Field
from typing import Optional


class FileUploadBase64(BaseModel):
    id: Optional[str] = Field(None, description="id")
    # 传 dataURL 或 纯 base64 都行
    content_base64: str = Field(..., description="dataURL 或 纯 base64（不含头）")
    # 可选：有文件名就传，便于后端校验与生成落盘名
    filename: Optional[str] = Field(None, description="原始文件名，如 a.png")
    # 可选：当为纯 base64 时可传 mime，便于确定扩展名
    mime_type: Optional[str] = Field(None, description="MIME 类型，如 image/png")
    
class FileUploadUrl(BaseModel):
    # 可选：有文件名就传，便于后端校验与生成落盘名
    url: Optional[str] = Field(None, description="原始文件名，如 a.png")
    # 可选：当为纯 base64 时可传 mime，便于确定扩展名
    file_type: Optional[str] = Field(None, description="MIME 类型，如 image/png")