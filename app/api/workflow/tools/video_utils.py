# import av
# import numpy as np
# import skia
# from dataclasses import dataclass
# from typing import Optional, Iterator, Tuple

# @dataclass
# class VideoReader:
#     """
#     轻量级“Python 版 HTMLVideoElement”：
#     - width / height / fps / duration 与 <video> 的 videoWidth/videoHeight/duration 类似
#     - frame_at(t) 按秒抓取一帧，返回 skia.Image
#     - frames(step) 生成逐帧序列（可选步长，单位秒）
#     """
#     container: av.container.input.InputContainer
#     stream: av.video.stream.VideoStream
#     width: int
#     height: int
#     fps: Optional[float]
#     duration: Optional[float]  # 秒

#     @classmethod
#     def open(cls, url: str) -> "VideoReader":
#         # 打开视频，只读元数据（类似 <video preload="metadata">）
#         container = av.open(url, mode="r")  # 支持本地/HTTP/RTSP，取决于 FFmpeg 构建
#         stream = next(s for s in container.streams if s.type == "video")
#         width, height = stream.width, stream.height
#         fps = float(stream.average_rate) if stream.average_rate else None
            
#         # 估算时长（优先用视频流的 duration，否则用容器的）
#         if stream.duration and stream.time_base:
#             duration = float(stream.duration * stream.time_base)
#         elif container.duration:
#             duration = float(container.duration) / av.time_base
#         else:
#             duration = None
#         # frame = next(c.decode(stream))
#         # print("frame:", frame)
#         return cls(container=container, stream=stream,
#                    width=width, height=height, fps=fps, duration=duration)

#     def _ndarray_to_skia(self, arr: np.ndarray) -> skia.Image:
#         """
#         arr: HxWx3 (RGB) 或 HxWx4 (RGBA), uint8
#         """
#         if arr.dtype != np.uint8:
#             arr = arr.astype(np.uint8, copy=False)
#         if arr.ndim != 3 or arr.shape[2] not in (3, 4):
#             raise ValueError(f"Unexpected frame shape {arr.shape}")
#         if arr.shape[2] == 3:
#             # 补一个不透明 alpha 变成 RGBA
#             h, w, _ = arr.shape
#             alpha = np.full((h, w, 1), 255, dtype=np.uint8)
#             arr = np.concatenate([arr, alpha], axis=2)
#         return skia.Image.fromarray(arr)  # RGBA8888

#     def frame_at(self, t_sec: float) :  # -> skia.Image
#         """
#         跳转到时间 t_sec（秒）并解码返回最近的关键帧后的第一帧。
#         行为类似 video.currentTime=t; await 'seeked'; drawImage(video, ...)

#         提示：FFmpeg 按关键帧对齐 seek，返回的帧时间可能略早于/晚于 t_sec。
#         """
#         if t_sec < 0:
#             t_sec = 0.0
#         # 将秒转换成流时间基下的 PTS
#         if self.stream.time_base is None:
#             # 兜底：用容器时间基
#             ts = int(t_sec * av.time_base)
#             self.container.seek(ts)
#         else:
#             ts = int(t_sec / float(self.stream.time_base))
#             # backward=False 通常更接近目标时间，any_frame=False 对齐关键帧
#             self.container.seek(ts, any_frame=False, backward=True, stream=self.stream)

#         for frame in self.container.decode(self.stream):
#             arr = frame.to_ndarray(format="rgb24")  # HxWx3 RGB
#             return self._ndarray_to_skia(arr)
#         raise RuntimeError("Failed to decode frame at t=%.3f" % t_sec)

#     def frames(self, step_sec: Optional[float] = None, *,
#                start: float = 0.0, end: Optional[float] = None) -> Iterator[Tuple[float, skia.Image]]:
#         """
#         顺序遍历帧（可选指定起止时间与步长）；
#         若提供 step_sec，将按时间步长跳帧随机访问；不提供则线性解码所有帧。
#         产出：(时间戳秒, skia.Image)
#         """
#         if end is None and self.duration is not None:
#             end = self.duration

#         if step_sec and step_sec > 0:
#             t = max(0.0, start)
#             while end is None or t <= end:
#                 img = self.frame_at(t)
#                 yield (t, img)
#                 t += step_sec
#         else:
#             # 线性解码，时间戳由帧 PTS 计算
#             self.container.seek(int(max(0.0, start) / float(self.stream.time_base or 1)),
#                                 any_frame=False, backward=True, stream=self.stream)
#             for frame in self.container.decode(self.stream):
#                 if frame.pts is None or self.stream.time_base is None:
#                     t = None
#                 else:
#                     t = float(frame.pts * self.stream.time_base)
#                 if end is not None and t is not None and t > end:
#                     break
#                 arr = frame.to_ndarray(format="rgb24")
#                 yield (t if t is not None else 0.0, self._ndarray_to_skia(arr))

#     def close(self) -> None:
#         try:
#             self.container.close()
#         except Exception:
#             pass

# def _ndarray_to_skia(arr: np.ndarray) -> skia.Image:
#     """
#     arr: HxWx3 (RGB) 或 HxWx4 (RGBA), uint8
#     """
#     if arr.dtype != np.uint8:
#         arr = arr.astype(np.uint8, copy=False)
#     if arr.ndim != 3 or arr.shape[2] not in (3, 4):
#         raise ValueError(f"Unexpected frame shape {arr.shape}")
#     if arr.shape[2] == 3:
#         h, w, _ = arr.shape
#         alpha = np.full((h, w, 1), 255, dtype=np.uint8)
#         arr = np.concatenate([arr, alpha], axis=2)
#     return skia.Image.fromarray(arr)  # RGBA8888

# def frame_near_time(container: av.container.input.InputContainer,
#                     stream: av.video.stream.VideoStream,
#                     t_sec: float,
#                     *,
#                     fps_hint: Optional[float] = None,
#                     search_window_frames: int = 12) -> Tuple[float, skia.Image]:
#     """
#     在时间 t_sec 附近取“最接近”的一帧。
#     返回：(该帧时间戳秒, skia.Image)
#     """
#     fps = float(stream.average_rate) if stream.average_rate else (fps_hint or 30.0)
#     tol = 0.5 / fps  # 半帧容差

#     # 计算 seek 位置（对齐关键帧）
#     if stream.time_base is None:
#         container.seek(int(t_sec * av.time_base))
#     else:
#         ts = int(t_sec / float(stream.time_base))
#         container.seek(ts, any_frame=False, backward=True, stream=stream)

#     best = (float('inf'), None, None)  # (abs diff, t_frame, skia_image)

#     decoded = 0
#     for frame in container.decode(stream):
#         if frame.pts is None or stream.time_base is None:
#             continue
#         t_frame = float(frame.pts * stream.time_base)
#         diff = abs(t_frame - t_sec)

#         # # 转成 skia.Image
#         arr = frame.to_ndarray(format="bgra")  # 或 "bgra"
#         img = skia.Image.fromarray(arr)
#         if diff < best[0]:
#             best = (diff, t_frame, img)

#         decoded += 1
#         # 如果已经进入容差范围或超过窗口，就停止
#         if diff <= tol or decoded >= search_window_frames or t_frame > t_sec + tol:
#             break

#     if best[1] is None or best[2] is None:
#         raise RuntimeError("Failed to decode frame near t=%.3f" % t_sec)
#     return best[1], best[2]

# def grab_frame_for_clip_time_precise(vr, current_time: float, clip_start: float, trim_start: float) -> skia.Image:
#     video_time = trim_start + (current_time - clip_start)

#     fps = vr.fps or 30.0
#     if vr.duration:
#         safe_end = max(0.0, vr.duration - 0.5 / fps)
#         t = max(0.0, min(video_time, safe_end))
#     else:
#         t = max(0.0, video_time)

#     # 使用底层容器/流做“近似目标时间”的多帧选择
#     _, img = frame_near_time(vr.container, vr.stream, t, fps_hint=fps, search_window_frames=6)
#     return img
    
# def load_video(url: str) -> VideoReader:
#     """
#     Python 版的 loadVideo：
#     - 打开视频并读取元数据（相当于 onloadedmetadata）
#     - 返回可用于取帧的 VideoReader
#     """
#     return VideoReader.open(url)
