import os
import re
import binascii
import base64
import secrets
from pathlib import Path as FilePath
from typing import Optional, Dict, Any

from fastapi import HTTPException
from app.api.workflow.pydantic_model.file_upload_pydantic import FileUploadBase64
from fastapi import File, UploadFile

# 允许通过环境变量设置上传目录，但无论传什么最终都会被限制在解析后的 BASE_DIR 下
UPLOAD_DIR = FilePath(os.getenv("FILE_UPLOAD_DIR", ""))
BASE_DIR = (UPLOAD_DIR if UPLOAD_DIR.is_absolute() else (FilePath.cwd() / UPLOAD_DIR)).resolve()

# dataURL: data:<mime>;base64,<data>
DATAURL_RE = re.compile(r"^data:(?P<mime>[-\w.+/]+);base64,(?P<data>[A-Za-z0-9+/=\s]+)$")

# MIME -> 扩展名（兜底映射）
MIME_EXT: Dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/zip": ".zip",
}

# 白名单
ALLOWED_EXT = {".jpg", ".png", ".pdf", ".txt", ".zip"}

# 大小限制（字节）
MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20MB


def safe_name(original: str) -> str:
    """用随机前缀 + 原后缀生成安全文件名；统一 .jpeg -> .jpg。"""
    suffix = FilePath(original).suffix.lower()
    if suffix == ".jpeg":
        suffix = ".jpg"
    return f"{secrets.token_hex(8)}{suffix}"


def _approx_decoded_size_from_b64(b64_text: str) -> int:
    """基于 base64 字符串长度估算原始大小，用于预检。"""
    s = re.sub(r"\s+", "", b64_text)
    padding = s.count("=")
    return (len(s) * 3) // 4 - padding


def _sniff_mime(data: bytes) -> Optional[str]:
    """用魔数粗略识别常见类型。"""
    if len(data) < 4:
        return None
    
    # 更准确的JPEG检测
    if data.startswith(b"\xFF\xD8") and data[2:3] == b"\xFF":
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    if data.startswith(b"PK\x03\x04"):
        return "application/zip"
    return None

def _ensure_within_base(path: FilePath) -> None:
    """保证写入路径在 BASE_DIR 内，防止路径穿越或恶意环境变量。"""
    try:
        resolved = path.resolve()
        base_resolved = BASE_DIR.resolve()
        # 使用 relative_to 方法更安全地检查路径关系
        resolved.relative_to(base_resolved)
    except ValueError:
        raise HTTPException(status_code=400, detail="非法保存路径")

def write_file_base64(payload: FileUploadBase64) -> Dict[str, Any]:
    """
    将 Base64 或 dataURL 写入磁盘。返回文件元信息：
    { path, filename, size, ext, mime }
    """
    # 0) 入参校验
    raw = (payload.content_base64 or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="content_base64 不能为空")

    # 1) 解析 dataURL / 纯 base64
    mime_from_meta: Optional[str] = None
    m = DATAURL_RE.match(raw)
    if m:
        mime_from_meta = m.group("mime")
        b64_part = m.group("data")
    else:
        b64_part = raw
    b64_part = re.sub(r"\s+", "", b64_part)

    # 2) 大小预检（避免超大数据占用内存）
    approx = _approx_decoded_size_from_b64(b64_part)
    if approx > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="文件过大")

    # 3) 解码（精确异常）
    try:
        data = base64.b64decode(b64_part, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="base64 解码失败")

    # 4) 精确大小校验
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="文件过大")

    # 5) 推断扩展名（优先顺序：filename -> dataURL/显式 mime_type -> 魔数）
    ext: Optional[str] = None

    # 5.1 filename
    if payload.filename:
        ext = FilePath(payload.filename).suffix.lower() or None
        if ext == ".jpeg":
            ext = ".jpg"

    # 5.2 dataURL / 显式 mime_type
    if not ext and mime_from_meta:
        ext = MIME_EXT.get(mime_from_meta)
    if not ext and getattr(payload, "mime_type", None):
        ext = MIME_EXT.get(payload.mime_type)

    # 5.3 魔数兜底（若能 sniff 出来）
    sniffed_mime = _sniff_mime(data)
    if not ext and sniffed_mime:
        ext = MIME_EXT.get(sniffed_mime)

    if not ext:
        raise HTTPException(status_code=400, detail="无法确定文件类型，请提供 filename 或 mime_type 或 dataURL")

    # 6) 白名单校验
    if ext not in ALLOWED_EXT:
        allow_list = ", ".join(sorted(ALLOWED_EXT))
        raise HTTPException(status_code=400, detail=f"仅允许: {allow_list}")

    # 7) 扩展名与内容一致性（若 sniff 到类型但与扩展名不一致则拒绝）
    if sniffed_mime:
        expected_ext = MIME_EXT.get(sniffed_mime)
        if expected_ext and expected_ext != ext:
            raise HTTPException(status_code=400, detail="文件内容与扩展名不匹配")

    # 8) 目标路径（以随机名防穿越），并强制在 BASE_DIR 内
    final_name = safe_name(payload.filename or f"upload{ext}")
    dest = (BASE_DIR / final_name)
    _ensure_within_base(dest)
          
    # 9) 写入
    try:
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open("wb") as f:
            f.write(data)
    except OSError:
        # 细节记录到服务端日志，避免泄露内部路径/环境
        raise HTTPException(status_code=500, detail="保存失败")

    # 10) 返回元信息
    return {
        "path": str(dest),
        "relative_path":  str(UPLOAD_DIR / final_name),
        "filename": dest.name,
        "size": len(data),
        "ext": ext,
        "mime": mime_from_meta or getattr(payload, "mime_type", None) or sniffed_mime,
    }


async def write_file(file: UploadFile = File(...)):
     if not file.filename:
        raise HTTPException(400, "空文件名")

    # 关键：使用你设置的 UPLOAD_DIR
     dest = UPLOAD_DIR / safe_name(file.filename)

     try:
        with dest.open("wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)
     finally:
        await file.close()
     return {
         "url":  str(dest),
         "file_name": file.filename
     }