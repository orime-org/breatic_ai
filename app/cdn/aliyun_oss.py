import os
import time
import random
import string
from urllib.parse import urlparse
import base64
import io
import asyncio
import aiohttp
from typing import Dict, Any
import logging
import re
import unicodedata
import oss2
import sys
import httpx

class AliyunOss:
    """
    阿里云OSS客户端,用于上传图片到OSS
    https://github.com/aliyun/aliyun-oss-python-sdk
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """
        初始化阿里云OSS客户端
        """        
        self.access_key = os.environ.get("ALIYUN_ACCESS_KEY", "")
        self.secret_key = os.environ.get("ALIYUN_SECRET_KEY", "")
        self.bucket_name = os.environ.get("ALIYUN_OSS_BUCKET_NAME", "")
        self.endpoint = os.environ.get("ALIYUN_OSS_ENDPOINT", "")
        self.resource_base_url = os.environ.get("ALIYUN_OSS_RESOURCE_BASE_URL", "")

        auth = oss2.Auth(self.access_key, self.secret_key)
        self.bucket = oss2.Bucket(auth, self.endpoint, self.bucket_name)
        
        #重试次数
        self.max_retries = 3
                        
    def generate_unique_key(self, extension,prefix: str = ""):
        timestamp = int(time.time() * 1000)  # Convert to milliseconds
        random_string = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        if prefix:
            prefix = prefix.rstrip('/') + '/'
        if extension and not extension.startswith('.'):
            extension = '.' + extension
            
        return f"{prefix}{timestamp}-{random_string}{extension}"

    async def upload_from_url(self, source_url: str) -> Dict[str, Any]:
        return await self.upload_from_url0(source_url,".png","image")
        
    async def upload_from_url0(self, source_url: str,extension: str,prefix: str = "") -> Dict[str, Any]:
        """
        从URL上传图片到OSS
        
        Args:
            source_url: 图片URL
        """   
        
        for attempt in range(self.max_retries):     
            try:
                # 3. 获取图片二进制流（避免本地保存）
                async with aiohttp.ClientSession() as session:
                    async with session.get(source_url, ssl=False) as response:
                        if response.status != 200:
                            logging.error(f"Download image failed, HTTP status code: {response.status}")
                            continue
                        
                        # 读取响应内容
                        content = await response.read()
                        
                # 4. 将图片流上传至COS
                file_stream = io.BytesIO(content)  # 转换为内存中的二进制流
                    
                object_key = self.generate_unique_key(extension=extension,prefix=prefix)
                # 使用 asyncio.to_thread 在线程池中执行同步操作
                await asyncio.to_thread(
                    self.bucket.put_object,
                    key=object_key,
                    data=file_stream,
                )
                
                return {
                    "status": "success",
                    "message": "Image uploaded successfully",
                    "resource_url": f"{self.resource_base_url}/{object_key}"
                }
                            
            except Exception as e:
                # 其他未预期的错误
                error_message = f"upload url image to oss failed: {str(e)}"
                logging.error(error_message)
                
            if attempt == self.max_retries - 1:  # 最后一次重试
                error_msg = f"upload url image to oss failed after {self.max_retries} attempts"
                return {
                    "status": "error",
                    "message": error_msg
                }
            else:
                logging.warning(f"upload url image to oss attempt {attempt + 1}, retrying...")
                await asyncio.sleep(2 ** attempt)  # 指数退避、
    
    async def upload_file_from_local(self,extension,prefix,local_path: str) -> Dict[str, Any]:
        object_key = self.generate_unique_key(extension=f"{extension}",prefix=prefix)
        for attempt in range(self.max_retries):    
            try:
                await asyncio.to_thread(self.bucket.put_object_from_file,key=object_key, filename=local_path)
                return {
                    "status": "success",
                    "message": "Image uploaded successfully",
                    "resource_url": f"{self.resource_base_url}/{object_key}"
                } 
            except Exception as e:
                # 其他未预期的错误
                error_message = f"upload local_file to oss failed: {str(e)}"
                logging.error(error_message)
                
            if attempt == self.max_retries - 1:  # 最后一次重试
                error_msg = f"upload base64 image to oss failed after {self.max_retries} attempts"
                return {
                    "status": "error",
                    "message": error_msg
                }
            else:
                logging.warning(f"upload base64 image to oss attempt {attempt + 1}, retrying...")
                await asyncio.sleep(2 ** attempt)  # 指数退避

    async def upload_base64(self, base64_data: str, filename: str) -> Dict[str, Any]:
        return await self.upload_base640(base64_data, filename,"image")

    async def upload_base640(self, base64_data: str, extension: str,prefix: str) -> Dict[str, Any]:
        """
        从Base64字符串上传图片到OSS
        
        Args:
            base64_data: Base64字符串
        """
        for attempt in range(self.max_retries):    
            try:
                # 处理base64数据
                # 检查是否包含data URI scheme (如 "data:image/png;base64,")
                if ";" in base64_data and "," in base64_data:
                    # 提取实际的base64数据
                    encoded = base64_data.split(",", 1)[1]
                else:
                    encoded = base64_data
                    
                file_bytes = base64.b64decode(encoded)
                file_stream = io.BytesIO(file_bytes)
                
                object_key = self.generate_unique_key(extension=f"{extension}",prefix=prefix)
                
                # response = self.cos_client.put_object(
                #     Bucket=self.bucket_name,
                #     Key=object_key,
                #     Body=file_stream,
                # )
                
                # 使用 asyncio.to_thread 在线程池中执行同步操作
                await asyncio.to_thread(
                    self.bucket.put_object,
                    key=object_key,
                    data=file_stream
                )
                
                return {
                    "status": "success",
                    "message": "Image uploaded successfully",
                    "resource_url": f"{self.resource_base_url}/{object_key}"
                }
                            
            except Exception as e:
                # 其他未预期的错误
                error_message = f"upload base64 image to oss failed: {str(e)}"
                logging.error(error_message)
                
            if attempt == self.max_retries - 1:  # 最后一次重试
                error_msg = f"upload base64 image to oss failed after {self.max_retries} attempts"
                return {
                    "status": "error",
                    "message": error_msg
                }
            else:
                logging.warning(f"upload base64 image to oss attempt {attempt + 1}, retrying...")
                await asyncio.sleep(2 ** attempt)  # 指数退避

    async def oss_put_object_threaded(self, upload_file, headers=None,
                                  max_tries=3, base=0.5, max_backoff=8.0, timeout=60.0):
    # upload_file: FastAPI UploadFile
        await upload_file.seek(0)

        for attempt in range(max_tries):
            try:
                safe = self.sanitize_filename(upload_file.filename)
                file_name = f"{safe}"
                file_names = file_name.split(".")
                ext_index = len(file_names) - 1
                
                object_key = self.generate_unique_key(extension=f"{file_names[ext_index]}",prefix="upload/")

                await asyncio.wait_for(
                    asyncio.to_thread(self.bucket.put_object, object_key, upload_file.file, headers=headers),
                    timeout=timeout,
                )
            
                return {
                    "status": "success",
                    "message": "Image uploaded successfully",
                    "resource_url": f"{self.resource_base_url}/{object_key}"
                }
            except Exception as e:
                if attempt == max_tries - 1:
                    raise
                # 指数退避 + 抖动
                delay = min(max_backoff, base * (2 ** attempt))
                await asyncio.sleep(random.uniform(0, delay))
                
    def sanitize_filename(self,name: str) -> str:
    # 基本清洗：basename、归一化、去危险字符、压缩空白
        name = os.path.basename(name or "").strip()
        name = unicodedata.normalize("NFKC", name)
        name = re.sub(r"\s+", "_", name)
        name = re.sub(r'[^A-Za-z0-9._-]', "", name)
        return name or "file"     

    async def stream_pipe_to_oss(self, ark_url: str, extension: str, prefix: str) -> dict:
        """
        从 Ark/TOS 签名 URL 边下边传到 OSS，不落地。
        成功返回: {"status":"ok","key":..., "size": <int or None>, "content_type": "..."}
        失败返回: {"status":"error","message": "..."}
        """
        def _once() -> dict:
            # 全部在同一线程中同步执行，避免阻塞事件循环
            with httpx.Client(http2=False, follow_redirects=True, timeout=(5.0, 300.0)) as c:
                with c.stream("GET", ark_url) as r:
                    r.raise_for_status()

                    # 同步生成器：按块迭代上游响应
                    def gen():
                        for chunk in r.iter_bytes(chunk_size=512 * 1024):
                            if chunk:
                                yield chunk

                    object_key = self.generate_unique_key(extension=extension, prefix=prefix)
                    headers = {
                        "Content-Type": r.headers.get("content-type", "application/octet-stream"),
                        "x-oss-forbid-overwrite": "false",
                    }
                    # 直接把生成器交给 oss2，走分块传输（chunked），无需 Content-Length
                    self.bucket.put_object(object_key, gen(), headers=headers)

                    size_hdr = r.headers.get("content-length")
                    size = int(size_hdr) if (size_hdr and size_hdr.isdigit()) else None
                    return {
                        "status": "ok",
                        "key": object_key,
                        "size": size,
                        "content_type": headers["Content-Type"],
                    }

        # 带重试 + 指数退避
        for attempt in range(self.max_retries):
            try:
                result = await asyncio.to_thread(_once)
                return result
            except Exception as e:
                logging.error("stream_pipe_to_oss attempt %d failed: %r", attempt + 1, e)
                if attempt == self.max_retries - 1:
                    return {"status": "error", "message": f"upload url image to oss failed after {self.max_retries} attempts: {e}"}
                await asyncio.sleep(2 ** attempt)  # 1,2,4,...s 退避

aliyun_oss_instance = AliyunOss()
