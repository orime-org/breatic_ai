from typing import List, Tuple, Dict, Any
import asyncio
import logging
import os
from app.cdn.aliyun_oss import aliyun_oss_instance
from app.editor.model.video.ffmpeg_video_utils import get_video_metadata
from app.editor.model.base_model import LLMError
from app.common.biz_response import BizCode
from app.editor.model.base_model import BaseModel
from app.common.httpx_client import httpx_client

class VideoTopazUpScalar(BaseModel):
    """
    Topaz Upscalar Model
    """

    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.credits_profit = float(os.getenv("CREDITS_PROFIT",0))
        self.api_key = os.environ.get("TOPAZ_API_KEY", "")
        # self.base_url = "https://api.topazlabs.com"
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
            "Referer": "https://www.breatic.ai",
            "X-Title": "Breatic",
        }

    async def acall(self, messages: Any,**kwargs) -> str:
            video_source = get_video_metadata(messages)
            data = {
                "source": video_source,
                "filters": [
                    {
                        "model": kwargs.get("model", "prob-4"),
                    }
                ],
                "output": {
                    "frameRate":  kwargs.get("frame_rate", video_source["frameRate"]),
                    "audioTransfer": "Copy",
                    "audioCodec": "AAC",
                    "videoEncoder": "H265",
                    "videoProfile": "Main",
                    "dynamicCompressionLevel": "High",
                    "resolution": {
                    "width": video_source["resolution"]["width"] * kwargs.get("upscale_factor", 2),
                    "height": video_source["resolution"]["height"] * kwargs.get("upscale_factor", 2),
                    }
                }
            }
            r = self.post_with_retry0(
                path="https://api.topazlabs.com/video/",
                headers=self.headers,
                json=data,
            )
            # r = await httpx_client.instance().post(f"https://api.topazlabs.com/video/", headers=self.headers, json=data)
            r.raise_for_status()
            create_resp = r.json()
          
            request_id = create_resp["requestId"]  # 字段名以实际响应为准
            upload_parts = await self.accept_request(request_id)

            results = await self.upload_parts_in_memory_concurrent(
                src_url=messages,
                request_id=request_id,
                size=video_source["size"],
                upload_parts=upload_parts,
            )
            return await self.get_video(request_id=request_id)


    async def accept_request(self,request_id: str):
        # 2) 接受请求（拿到上传URL）
        # r = await httpx_client.instance().patch(f"https://api.topazlabs.com/video/{request_id}/accept",
        #                   headers={"X-API-Key": self.api_key, "accept": "application/json"})
        await httpx_client.run_with_retries(do_request=lambda cli: cli.patch(f"https://api.topazlabs.com/video/{request_id}/accept",
                          headers={"X-API-Key": self.api_key, "accept": "application/json"}))
        r.raise_for_status()
        accept_resp = r.json()
        # 可能是单 URL，也可能是多分片 URL；字段以实际响应为准
        upload_parts = accept_resp.get("urls")
        return upload_parts
    
    async def upload_parts_in_memory_concurrent(self,src_url: str,request_id: str,size: int,upload_parts: List[str],
        content_type: str = "video/mp4",
        
        concurrency: int = 4,
        max_retries: int = 3
    ) -> List[Dict[str, Any]]:
        """
        不落盘，整包下载到内存后并发 PUT。
        返回: [{"partNum": i, "eTag": "..."}]（按 partNum 升序）
        """
        
        # r = await httpx_client.instance().get(src_url)
        r = await httpx_client.run_with_retries(do_request=lambda cli: cli.get(src_url))
        r.raise_for_status()
        data = r.content


        n = len(upload_parts)
        ranges = self.split_ranges(size, n)

        sem = asyncio.Semaphore(concurrency)
        results: Dict[int, Dict[str, Any]] = {}
        done = 0

        async def _put_one(idx: int, part_url: str):
            nonlocal done
            start, end = ranges[idx - 1]
            # 闭区间 [start, end]，Python 切片右开，需要 end+1
            payload_mv = memoryview(data)[start:end + 1]
            payload = bytes(payload_mv)  # ← 明确 bytes
            headers = dict(self.headers)
            headers["Content-Length"] = str(len(payload))

            for attempt in range(1, max_retries + 1):
                try:
                    async with sem:
                        # 复用同一个 AsyncClient，减少握手/建连
                        # resp = await httpx_client.instance().put(part_url, content=payload, headers=headers)
                        resp = await httpx_client.run_with_retries(do_request=lambda cli: cli.put(part_url, content=payload, headers=headers))
                        resp.raise_for_status()
                        etag = (resp.headers.get("ETag") or "").strip('"')
                        results[idx] = {"partNum": idx, "eTag": etag}
                        break
                except Exception as e:
                    if attempt >= max_retries:
                        raise
                        # 指数退避 + 少量随机抖动
                    await asyncio.sleep(0.6 * attempt + 0.2 * (attempt % 3))
            # 进度回调
            done += 1
            # 若有回调则告知 (已完成, 总数)
            # if on_progress: on_progress(done, len(upload_parts))

        tasks = [asyncio.create_task(_put_one(i + 1, url)) for i, url in enumerate(upload_parts)]
        await asyncio.gather(*tasks)
        
        results = [results[i] for i in sorted(results)]
        # 4) 完成上传（上报 ETag）
        complete_payload = {"uploadResults": results}

        r = await httpx_client.run_with_retries(do_request=lambda cli: cli.patch(f"https://api.topazlabs.com/video/{request_id}/complete-upload",
                    headers=self.headers, json=complete_payload))
        r.raise_for_status()


    def parse_content(self,message, content,**kwargs):
        return {
                "kwargs": kwargs,
                "message": message,
                "content": content
            }

    def split_ranges(self,total_bytes: int, parts: int) -> List[Tuple[int, int]]:
        """
        返回 [ (start, end), ... ]，均为半开区间 [start, end)；end 不包含在内。
        各片大小之差不超过 1 字节；前面若干片多 1。
        """
        if parts <= 0:
            raise ValueError("parts must be >= 1")
        if total_bytes < 0:
            raise ValueError("total_bytes must be >= 0")
        if parts == 1:
            return [(0, total_bytes)]

        base = total_bytes // parts
        rem  = total_bytes % parts

        ranges: List[Tuple[int, int]] = []
        start = 0
        for i in range(parts):
            size = base + (1 if i < rem else 0)
            end = start + size
            ranges.append((start, end))
            start = end
        return ranges

        
    async def get_video(self, request_id: str):
        while True:
            try:
                video_url = f"https://api.topazlabs.com/video/{request_id}/status"
                response = await self.get_with_retry0(video_url,headers=self.headers)
                video = response.json()
                if video["status"] == "complete":
                    logging.info(f"VideoTopazUpScalar get_video response: {video}")
                    url = video["download"]["url"]
                    oss_result  = await aliyun_oss_instance.upload_from_url0(url, extension=".mp4",prefix="video")
                    status = oss_result["status"]
                    if status != "success":
                        raise LLMError(BizCode.OSS_UPLOAD_FAILED.code, f"upload to oss failed: {status}")
                    else:
                        model_crdits = video["estimates"]["cost"][1] * 0.1 * 100 
                        used_crdits = model_crdits * self.credits_profit
                    return {"data": oss_result["resource_url"],"credits": used_crdits,"model_credits": model_crdits}

                elif video["status"] == "failed":
                    logging.error(f"VideoTopazUpScalar get_video failed: {video}")
                    # raise RuntimeError(f"VideoTopazUpScalar get_video failed: {video}")
                    raise LLMError(BizCode.MODEL_STATUS_FAILED.code, f"VideoTopazUpScalar get_video unknown status: {video}")
            except Exception as e:
                logging.error(f"VideoTopazUpScalar get_video error: {e}")
                raise LLMError(BizCode.MODEL_REQUEST_FAILED.code, f"VideoTopazUpScalar get_video error: {e}")

video_topaz_upscalar_instance = VideoTopazUpScalar()