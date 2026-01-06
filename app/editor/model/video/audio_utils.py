import os
import math
import json
import base64
import tempfile
import subprocess
from typing import Optional

import httpx  # pip install "httpx[http2]"
from app.cdn.aliyun_oss import aliyun_oss_instance

EPS = 1e-3  # 防浮点边界误差（毫秒级）

# ====================== 基础工具 ======================

def is_url(s: str) -> bool:
    return isinstance(s, str) and s.lower().startswith(("http://", "https://"))

def _run(cmd: str) -> str:
    """运行命令并返回 stdout；失败抛异常（包含 stderr 便于排查）"""
    print("CMD>", cmd)
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"Command failed ({p.returncode}):\n{cmd}\nSTDOUT:\n{p.stdout}\nSTDERR:\n{p.stderr}")
    return p.stdout

def run_ffmpeg(cmd: str) -> None:
    """统一加 -y 覆盖、降噪日志、避免交互阻塞；失败时带出 stdout/stderr。"""
    full = f'ffmpeg -y -hide_banner -loglevel warning -nostdin {cmd}'
    print("FFmpeg>", full)
    p = subprocess.run(full, shell=True, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(
            "ffmpeg failed\n"
            f"CMD: {full}\n"
            f"STDOUT:\n{p.stdout}\n"
            f"STDERR:\n{p.stderr}"
        )

def ffprobe_duration(path_or_url: str) -> float:
    """
    容器层总时长（秒）。本地与网络源分别处理；网络源加重连参数。
    """
    if is_url(path_or_url):
        cmd = (
            f'ffprobe -v error -hide_banner '
            f'-reconnect 1 -reconnect_streamed 1 -reconnect_at_eof 1 '
            f'-show_entries format=duration -of csv=p=0 "{path_or_url}"'
        )
    else:
        cmd = (
            f'ffprobe -v error -hide_banner '
            f'-show_entries format=duration -of csv=p=0 "{path_or_url}"'
        )
    out = _run(cmd).strip()
    dur = float(out)
    if not math.isfinite(dur) or dur <= 0:
        raise ValueError(f"Invalid duration for {path_or_url!r}: {dur}")
    return dur

def audio_duration_accurate(path_or_url: str) -> float:
    """
    用 nb_samples / sample_rate 计算音频时长（秒，毫秒级），
    回退到 format.duration；适合 VBR/无时长头的音频。
    """
    cmd = (
        f'ffprobe -v error -hide_banner '
        f'-show_entries stream=codec_type,sample_rate,nb_samples '
        f'-show_entries format=duration '
        f'-of json "{path_or_url}"'
    )
    info = json.loads(_run(cmd))
    for s in info.get("streams", []):
        if s.get("codec_type") == "audio":
            sr = s.get("sample_rate")
            ns = s.get("nb_samples")
            if sr and ns:
                sr = float(sr); ns = float(ns)
                if sr > 0 and ns >= 0:
                    return ns / sr
    dur = float(info["format"]["duration"])
    if not math.isfinite(dur) or dur <= 0:
        raise ValueError(f"Cannot determine audio duration for {path_or_url!r}")
    return dur

async def adownload_to_temp(url: str, suffix: str = "") -> str:
    """
    下载 URL 到本地临时文件（异步流式），返回路径。HTTP/2、跟随跳转、简易重试。
    """
    timeout = httpx.Timeout(connect=5.0, read=120.0, write=120.0, pool=5.0)
    last_err = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(http2=True, follow_redirects=True, timeout=timeout) as client:
                async with client.stream("GET", url) as r:
                    r.raise_for_status()
                    fd, path = tempfile.mkstemp(
                        suffix=suffix or os.path.splitext(url.split("?", 1)[0])[1] or ".bin"
                    )
                    os.close(fd)
                    with open(path, "wb") as f:
                        async for chunk in r.aiter_bytes(1 << 20):
                            if chunk:
                                f.write(chunk)
                        f.flush()
                        os.fsync(f.fileno())
            return path
        except Exception as e:
            last_err = e
            # 可加指数退避等策略
    raise last_err
def has_audio_stream(path_or_url: str) -> bool:
    info = json.loads(_run(
        f'ffprobe -v error -hide_banner -select_streams a '
        f'-show_entries stream=codec_type -of json "{path_or_url}"'
    ))
    return any(s.get("codec_type") == "audio" for s in info.get("streams", []))

def file_to_b64_stream(path: str, chunk: int = 1 << 20) -> str:
    """将文件转 Base64（分块读，最终拼一个字符串，适配 upload_base640）。"""
    parts = []
    with open(path, "rb") as f:
        while True:
            buf = f.read(chunk)
            if not buf:
                break
            parts.append(base64.b64encode(buf).decode("utf-8"))
    return "".join(parts)

def transcode_audio_to_wav(src_audio: str) -> str:
    """
    预解码音频为 WAV（PCM 16-bit），避免 MP3 起始/边界帧、VBR、标签干扰。
    不强制改采样率与声道，让 ffmpeg保持原始参数（只换编码）。
    """
    fd, wav = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    run_ffmpeg(f'-i "{src_audio}" -vn -c:a pcm_s16le "{wav}"')
    return wav

# ====================== 主流程 ======================

async def process(video_url: str, audio_url: str, mode: str, *, cleanup_on_fail: bool = True) -> dict:
    """
    :param video_url: 原视频 URL（只读）
    :param audio_url: 参考音频 URL（作为最终音轨来源）
    :param mode: "cutoff" | "loop" | "pingpong"
    :param cleanup_on_fail: 失败时是否也删除临时文件
    :return: dict: {"oss_result": ..., "time": <裁剪时长秒>, "mode": ...}
    """
    temp_paths = []
    succeeded = False
    T: Optional[float] = None

    try:
        # 1) 音频先下载到本地，避免 VBR/断流导致的时长不准；随后统一转 WAV
        audio_local = await adownload_to_temp(audio_url, ".mp3")
        temp_paths.append(audio_local)

        audio_wav = transcode_audio_to_wav(audio_local)
        temp_paths.append(audio_wav)

        # 2) 精确获得音频时长（毫秒级）；视频时长本地/网络分别处理
        adur = audio_duration_accurate(audio_wav)

        # loop/pingpong：为保证 -stream_loop 稳定，建议将视频落地到本地后再参与处理
        video_in = video_url
        if mode in ("loop", "pingpong"):
            video_in = await adownload_to_temp(video_url, ".mp4")
            temp_paths.append(video_in)

        vdur = ffprobe_duration(video_in)

        if adur <= 0:
            raise ValueError(f"Audio duration must be > 0, got {adur}")
        if vdur <= 0:
            raise ValueError(f"Video duration must be > 0, got {vdur}")

        # 3) 输出临时文件（.mp4）
        fd, out = tempfile.mkstemp(suffix=".mp4")
        os.close(fd)
        temp_paths.append(out)
        has_audio = has_audio_stream(video_in)
        # 4) 根据 mode 处理
        if mode == "cut_off":
            # 目标时长 = 两者较短；两轨都精确裁到 T
            T = max(0.0, min(vdur, adur) - EPS)
            # 对远程视频可加大探测；本地无影响（参数被忽略）
            if has_audio:
                run_ffmpeg(
                    f'-probesize 50M -analyzeduration 50M -i "{video_in}" '
                    f'-filter_complex '
                    f'"[0:v]trim=0:{T:.3f},setpts=PTS-STARTPTS[v];'
                    f' [0:a]atrim=0:{T:.3f},asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0[a]" '
                    f'-map "[v]" -map "[a]" '
                    f'-c:v libx264 -preset veryfast -crf 20 -c:a aac -movflags +faststart "{out}"'
                )
            else:
                # 原片无音轨：只裁视频，输出无声
                run_ffmpeg(
                    f'-probesize 50M -analyzeduration 50M -i "{video_in}" '
                    f'-filter_complex "[0:v]trim=0:{T:.3f},setpts=PTS-STARTPTS[v]" '
                    f'-map "[v]" -an '
                    f'-c:v libx264 -preset veryfast -crf 20 -movflags +faststart "{out}"'
                )

        elif mode == "loop":
            # 目标时长 = 音频长度；视频循环并精确裁到 T；音频精确裁到 T
            T = max(0.0, adur - EPS)
            if has_audio:
                run_ffmpeg(
                    f'-stream_loop -1 -i "{video_in}" '
                    f'-filter_complex '
                    f'"[0:v]trim=0:{T:.3f},setpts=PTS-STARTPTS[v];'
                    f' [0:a]atrim=0:{T:.3f},asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0[a]" '
                    f'-map "[v]" -map "[a]" '
                    f'-c:v libx264 -preset veryfast -crf 20 -c:a aac -movflags +faststart "{out}"'
                )
            else:
                run_ffmpeg(
                    f'-stream_loop -1 -i "{video_in}" '
                    f'-filter_complex "[0:v]trim=0:{T:.3f},setpts=PTS-STARTPTS[v]" '
                    f'-map "[v]" -an '
                    f'-c:v libx264 -preset veryfast -crf 20 -movflags +faststart "{out}"'
                )

        elif mode == "ping_pong":
            # 目标时长 = 音频长度；视频先做 ping-pong 单元，再循环并精确裁到 T；音频精确裁到 T
            T = max(0.0, adur - EPS)
            unit = out.replace(".mp4", "_unit.mp4")
            temp_paths.append(unit)

            # 先做乒乓“纯视频”单元
            run_ffmpeg(
                f'-probesize 50M -analyzeduration 50M -i "{video_in}" '
                f'-filter_complex '
                f'"[0:v]split=f[r];[r]reverse[rev];[f][rev]concat=n=2:v=1:a=0,setsar=1[v]" '
                f'-map "[v]" -an -c:v libx264 -preset veryfast -crf 20 "{unit}"'
            )
            if has_audio:
                # 循环乒乓视频 + 循环原声（来自原始视频输入），最后只输出原声
                run_ffmpeg(
                    f'-stream_loop -1 -i "{unit}" '      # 0: 乒乓视频（无声）
                    f'-stream_loop -1 -i "{video_in}" '  # 1: 原始视频（取其音轨循环）
                    f'-filter_complex '
                    f'"[0:v]trim=0:{T:.3f},setpts=PTS-STARTPTS[v];'
                    f' [1:a]atrim=0:{T:.3f},asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0[a]" '
                    f'-map "[v]" -map "[a]" '
                    f'-c:v libx264 -preset veryfast -crf 20 -c:a aac -movflags +faststart "{out}"'
                )
            else:
                run_ffmpeg(
                    f'-stream_loop -1 -i "{unit}" '
                    f'-filter_complex "[0:v]trim=0:{T:.3f},setpts=PTS-STARTPTS[v]" '
                    f'-map "[v]" -an '
                    f'-c:v libx264 -preset veryfast -crf 20 -movflags +faststart "{out}"'
                )
            # # 再循环单元 + 精确裁到 T；音频同样精确裁到 T
            # run_ffmpeg(
            #     f'-stream_loop -1 -i "{unit}" '
            #     f'-i "{audio_wav}" '
            #     f'-filter_complex '
            #     f'"[0:v]trim=0:{T:.3f},setpts=PTS-STARTPTS[v];'
            #     f' [1:a]atrim=0:{T:.3f},asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0[a]" '
            #     f'-map "[v]" -map "[a]" '
            #     f'-c:v libx264 -preset veryfast -crf 20 -c:a aac -shortest -movflags +faststart "{out}"'
            # )

        else:
            raise ValueError('mode must be one of: "cutoff" | "loop" | "pingpong"')

        # 5) 上传（Base64）
        b64 = file_to_b64_stream(out)
        oss_result = await aliyun_oss_instance.upload_base640(b64, extension=".mp4", prefix="video")
        succeeded = True
        return {"oss_result": oss_result, "time": round(float(T or 0.0), 3), "mode": mode}

    finally:
        # 6) 清理（成功一定删；失败根据开关）
        for p in temp_paths:
            try:
                if succeeded or cleanup_on_fail:
                    if p and os.path.exists(p):
                        os.remove(p)
            except Exception:
                pass