# s3_async_tool.py
from __future__ import annotations
import os, mimetypes, asyncio, contextlib, random
from typing import Optional, Dict, AsyncIterator, List, Tuple
from contextlib import asynccontextmanager

import aioboto3
from botocore.client import Config
from botocore.exceptions import ClientError

# 可选：FastAPI 路由（不需要可删）
try:
    from fastapi import APIRouter, UploadFile, File, HTTPException, Query
    from fastapi.responses import StreamingResponse, JSONResponse
    HAS_FASTAPI = True
except Exception:  # noqa: BLE001
    HAS_FASTAPI = False
    APIRouter = object  # type: ignore


# ----------------------------- Core Utility -----------------------------
class S3Async:
    """
    轻量异步 S3 工具：
    - 预签名 URL（同步，本地签名）
    - put/get/head/acl/delete/copy（异步）
    - 流式下载到前端/本地
    - 分片并发上传（可配置并发数/分片大小/重试）
    """
    def __init__(self, region: Optional[str] = None, addressing_style: str = "virtual"):
        self.region = region or os.getenv("AWS_REGION", "us-east-1")
        self._config = Config(s3={"addressing_style": addressing_style})
        self._session = aioboto3.Session(region_name=self.region)

    @asynccontextmanager
    async def client(self):
        async with self._session.client("s3", config=self._config) as c:
            yield c

    # ---------- helpers ----------
    @staticmethod
    def _guess_content_type(path_or_key: str) -> str:
        ct, _ = mimetypes.guess_type(path_or_key)
        return ct or "application/octet-stream"

    # ---------- URLs / Presign (no network) ----------
    def public_object_url(self, bucket: str, key: str, accelerate: bool = False) -> str:
        if accelerate:
            host = f"https://{bucket}.s3-accelerate.amazonaws.com"
        else:
            host = f"https://{bucket}.s3.{self.region}.amazonaws.com"
        return f"{host}/{key}"

    def presign_get_url(
        self,
        bucket: str,
        key: str,
        expires: int = 300,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> str:
        client = self._session.client("s3", config=self._config)  # sync presign
        params: Dict[str, str] = {"Bucket": bucket, "Key": key}
        if filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
        if content_type:
            params["ResponseContentType"] = content_type
        return client.generate_presigned_url("get_object", Params=params, ExpiresIn=expires)

    def presign_put_url(
        self,
        bucket: str,
        key: str,
        expires: int = 300,
        content_type: Optional[str] = None,
        public: bool = False,
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, object]:
        client = self._session.client("s3", config=self._config)  # sync presign
        params: Dict[str, object] = {"Bucket": bucket, "Key": key}
        headers: Dict[str, str] = {}
        if content_type:
            params["ContentType"] = content_type
            headers["Content-Type"] = content_type
        if public:
            params["ACL"] = "public-read"
            headers["x-amz-acl"] = "public-read"
        if extra_headers:
            headers.update(extra_headers)
        url = client.generate_presigned_url("put_object", Params=params, ExpiresIn=expires)
        return {"url": url, "headers": headers}

    # ---------- Simple put/get/head/acl ----------
    async def put_bytes(
        self,
        bucket: str,
        key: str,
        data: bytes,
        content_type: Optional[str] = None,
        public: bool = False,
        extra_args: Optional[Dict[str, object]] = None,
    ):
        args: Dict[str, object] = {"ContentType": content_type or self._guess_content_type(key)}
        if public:
            args["ACL"] = "public-read"
        if extra_args:
            args.update(extra_args)
        async with self.client() as s3:
            await s3.put_object(Bucket=bucket, Key=key, Body=data, **args)

    async def get_stream(self, bucket: str, key: str) -> Tuple[Dict[str, object], AsyncIterator[bytes]]:
        """
        返回 (meta, async iterator)；用于流式回传/写盘。
        注意：返回的 iterator 绑定了内部 client 的生命周期，消费完即释放。
        """
        async def _iter():
            async with self.client() as s3:
                resp = await s3.get_object(Bucket=bucket, Key=key)
                body = resp["Body"]
                # 把 meta 提前放到外部可读闭包域
                meta.update({
                    "ContentType": resp.get("ContentType"),
                    "ContentLength": resp.get("ContentLength"),
                    "ETag": resp.get("ETag"),
                    "LastModified": resp.get("LastModified"),
                    "CacheControl": resp.get("CacheControl"),
                })
                async for chunk in body.iter_chunks():
                    if chunk:
                        yield chunk
        meta: Dict[str, object] = {}
        return meta, _iter()

    async def head(self, bucket: str, key: str) -> Dict[str, object]:
        async with self.client() as s3:
            return await s3.head_object(Bucket=bucket, Key=key)

    async def exists(self, bucket: str, key: str) -> bool:
        try:
            await self.head(bucket, key)
            return True
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            status = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            if status == 404 or code in {"404", "NoSuchKey", "NotFound"}:
                return False
            raise

    async def set_public_read(self, bucket: str, key: str):
        async with self.client() as s3:
            await s3.put_object_acl(Bucket=bucket, Key=key, ACL="public-read")

    async def delete(self, bucket: str, key: str):
        async with self.client() as s3:
            await s3.delete_object(Bucket=bucket, Key=key)

    async def copy(self, src_bucket: str, src_key: str, dst_bucket: str, dst_key: str, **extra):
        async with self.client() as s3:
            await s3.copy_object(
                Bucket=dst_bucket,
                Key=dst_key,
                CopySource={"Bucket": src_bucket, "Key": src_key},
                **extra,
            )

    # ---------- File <-> S3 ----------
    async def upload_file_single(self, bucket: str, key: str, local_path: str, public: bool = False, content_type: Optional[str] = None):
        ct = content_type or self._guess_content_type(local_path)
        async with self.client() as s3:
            # 小文件直接读入内存；大文件用 multipart_upload
            async with await asyncio.to_thread(open, local_path, "rb") as f:  # avoid blocking loop on open()
                data = await asyncio.to_thread(f.read)
            args: Dict[str, object] = {"ContentType": ct}
            if public:
                args["ACL"] = "public-read"
            await s3.put_object(Bucket=bucket, Key=key, Body=data, **args)

    async def download_file_stream(self, bucket: str, key: str, local_path: str):
        os.makedirs(os.path.dirname(local_path) or ".", exist_ok=True)
        meta, it = await self.get_stream(bucket, key)
        async with await asyncio.to_thread(open, local_path, "wb") as f:
            async for chunk in it:
                await asyncio.to_thread(f.write, chunk)
        return meta

    # ---------- Multipart Upload (concurrent with retry) ----------
    async def upload_file_multipart(
        self,
        bucket: str,
        key: str,
        local_path: str,
        public: bool = False,
        content_type: Optional[str] = None,
        part_size: int = 8 * 1024 * 1024,   # >= 5MB except last part
        concurrency: int = 4,
        max_retries: int = 3,
        base_backoff: float = 0.5,  # seconds
    ):
        """
        并发分片上传本地文件；低内存占用 + 重试。
        """
        file_size = os.path.getsize(local_path)
        ct = content_type or self._guess_content_type(local_path)
        async with self.client() as s3:
            # 1) init
            create = await s3.create_multipart_upload(
                Bucket=bucket, Key=key, ContentType=ct, **({"ACL": "public-read"} if public else {})
            )
            upload_id = create["UploadId"]
            parts: List[Dict[str, object]] = []
            sem = asyncio.Semaphore(concurrency)

            async def upload_part(part_no: int, offset: int, size: int):
                # 读取该 part
                async with sem:
                    # 用线程池阻塞读盘
                    with open(local_path, "rb") as f:
                        f.seek(offset)
                        data = f.read(size)
                    # 重试带指数退避
                    attempt = 0
                    while True:
                        try:
                            resp = await s3.upload_part(
                                Bucket=bucket, Key=key, UploadId=upload_id, PartNumber=part_no, Body=data
                            )
                            return {"PartNumber": part_no, "ETag": resp["ETag"]}
                        except Exception as e:  # noqa: BLE001
                            attempt += 1
                            if attempt > max_retries:
                                raise
                            backoff = base_backoff * (2 ** (attempt - 1)) * (1 + random.random())
                            await asyncio.sleep(backoff)

            # 2) dispatch tasks
            tasks = []
            part_no = 1
            for offset in range(0, file_size, part_size):
                size = min(part_size, file_size - offset)
                tasks.append(asyncio.create_task(upload_part(part_no, offset, size)))
                part_no += 1

            try:
                results = await asyncio.gather(*tasks)
                parts.extend(sorted(results, key=lambda x: x["PartNumber"]))
                # 3) complete
                await s3.complete_multipart_upload(
                    Bucket=bucket, Key=key, UploadId=upload_id, MultipartUpload={"Parts": parts}
                )
                return {"ok": True, "parts": len(parts)}
            except Exception:
                with contextlib.suppress(Exception):
                    await s3.abort_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id)
                raise

# -------- 1) 直接从内存 bytes 上传（小文件） --------
async def upload_bytes(
    self,
    bucket: str,
    key: str,
    data: bytes,
    content_type: Optional[str] = None,
    public: bool = False,
    extra_args: Optional[Dict[str, object]] = None,
):
    args: Dict[str, object] = {"ContentType": content_type or self._guess_content_type(key)}
    if public:
        args["ACL"] = "public-read"
    if extra_args:
        args.update(extra_args)
    async with self.client() as s3:
        await s3.put_object(Bucket=bucket, Key=key, Body=data, **args)

# -------- 2) 从异步字节流顺序分片上传（不落盘，内存≈part_size）--------
async def upload_stream_sequential(
    self,
    bucket: str,
    key: str,
    source: AsyncIterator[bytes],          # e.g. an async generator yielding bytes
    content_type: Optional[str] = None,
    public: bool = False,
    part_size: int = 8 * 1024 * 1024,      # >=5MB except last part
):
    ct = content_type or self._guess_content_type(key)
    async with self.client() as s3:
        create = await s3.create_multipart_upload(
            Bucket=bucket, Key=key, ContentType=ct, **({"ACL": "public-read"} if public else {})
        )
        upload_id = create["UploadId"]
        parts, part_no = [], 1
        buffer = bytearray()

        try:
            async for chunk in source:
                if not chunk:
                    continue
                buffer.extend(chunk)
                # 满一片就上传
                while len(buffer) >= part_size:
                    piece = bytes(buffer[:part_size])
                    del buffer[:part_size]
                    resp = await s3.upload_part(
                        Bucket=bucket, Key=key, UploadId=upload_id, PartNumber=part_no, Body=piece
                    )
                    parts.append({"PartNumber": part_no, "ETag": resp["ETag"]})
                    part_no += 1

            # 处理最后不足一片的数据
            if len(buffer) > 0 or part_no == 1:
                # 如果整个文件只有最后一块且小于5MB，也可以直接 put_object
                if part_no == 1 and len(buffer) < 5 * 1024 * 1024:
                    await s3.put_object(Bucket=bucket, Key=key, Body=bytes(buffer), ContentType=ct,
                                        **({"ACL": "public-read"} if public else {}))
                    # 终止当前 multipart
                    await s3.abort_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id)
                    return {"ok": True, "parts": 1, "single_put": True}
                # 否则作为最后一片提交
                resp = await s3.upload_part(
                    Bucket=bucket, Key=key, UploadId=upload_id, PartNumber=part_no, Body=bytes(buffer)
                )
                parts.append({"PartNumber": part_no, "ETag": resp["ETag"]})

            await s3.complete_multipart_upload(
                Bucket=bucket, Key=key, UploadId=upload_id, MultipartUpload={"Parts": parts}
            )
            return {"ok": True, "parts": len(parts)}
        except Exception:
            with contextlib.suppress(Exception):
                await s3.abort_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id)
            raise

# -------- 3) 从异步字节流并发分片上传（不落盘，内存≈part_size*concurrency）--------
async def upload_stream_concurrent(
    self,
    bucket: str,
    key: str,
    source: AsyncIterator[bytes],
    content_type: Optional[str] = None,
    public: bool = False,
    part_size: int = 8 * 1024 * 1024,
    concurrency: int = 4,
    max_retries: int = 3,
    base_backoff: float = 0.5,
):
    ct = content_type or self._guess_content_type(key)
    sem = asyncio.Semaphore(concurrency)
    async with self.client() as s3:
        create = await s3.create_multipart_upload(
            Bucket=bucket, Key=key, ContentType=ct, **({"ACL": "public-read"} if public else {})
        )
        upload_id = create["UploadId"]
        tasks = []
        parts = []
        part_no = 1
        buffer = bytearray()

        async def upload_one(pn: int, data: bytes):
            async with sem:
                attempt = 0
                while True:
                    try:
                        resp = await s3.upload_part(
                            Bucket=bucket, Key=key, UploadId=upload_id, PartNumber=pn, Body=data
                        )
                        return {"PartNumber": pn, "ETag": resp["ETag"]}
                    except Exception:
                        attempt += 1
                        if attempt > max_retries:
                            raise
                        backoff = base_backoff * (2 ** (attempt - 1)) * (1 + random.random())
                        await asyncio.sleep(backoff)

        try:
            async for chunk in source:
                if not chunk:
                    continue
                buffer.extend(chunk)
                while len(buffer) >= part_size:
                    piece = bytes(buffer[:part_size])
                    del buffer[:part_size]
                    tasks.append(asyncio.create_task(upload_one(part_no, piece)))
                    part_no += 1

            # 剩余不足一片的数据
            if len(buffer) > 0:
                # 若总共只有这一片且<5MB，改为单请求 put_object 更省事
                if part_no == 1 and len(buffer) < 5 * 1024 * 1024:
                    await s3.put_object(Bucket=bucket, Key=key, Body=bytes(buffer), ContentType=ct,
                                        **({"ACL": "public-read"} if public else {}))
                    await s3.abort_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id)
                    return {"ok": True, "parts": 1, "single_put": True}
                tasks.append(asyncio.create_task(upload_one(part_no, bytes(buffer))))

            if not tasks:
                # 空文件
                await s3.put_object(Bucket=bucket, Key=key, Body=b"", ContentType=ct,
                                    **({"ACL": "public-read"} if public else {}))
                await s3.abort_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id)
                return {"ok": True, "empty": True}

            results = await asyncio.gather(*tasks)
            parts.extend(sorted(results, key=lambda x: x["PartNumber"]))
            await s3.complete_multipart_upload(
                Bucket=bucket, Key=key, UploadId=upload_id, MultipartUpload={"Parts": parts}
            )
            return {"ok": True, "parts": len(parts)}
        except Exception:
            with contextlib.suppress(Exception):
                await s3.abort_multipart_upload(Bucket=bucket, Key=key, UploadId=upload_id)
            raise

# -------- 4) FastAPI 的 UploadFile 辅助（直接从前端流，不落盘）--------
async def upload_uploadfile(
    self,
    bucket: str,
    key: str,
    file,                                  # FastAPI UploadFile
    public: bool = False,
    part_size: int = 8 * 1024 * 1024,
    concurrency: Optional[int] = None,     # None=顺序；>=1=并发
):
    ct = getattr(file, "content_type", None) or self._guess_content_type(key)

    async def gen() -> AsyncIterator[bytes]:
        while True:
            chunk = await file.read(part_size)
            if not chunk:
                break
            yield chunk

    if concurrency is None:
        return await self.upload_stream_sequential(bucket, key, gen(), content_type=ct, public=public, part_size=part_size)
    else:
        return await self.upload_stream_concurrent(bucket, key, gen(), content_type=ct, public=public,
                                                   part_size=part_size, concurrency=max(1, concurrency))
