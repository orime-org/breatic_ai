import json, math, os, shutil, subprocess
from fractions import Fraction
from urllib.parse import urlparse

def _parse_fps(stream):
    # 优先 avg_frame_rate，其次 r_frame_rate；都是 "num/den" 形式
    for key in ("avg_frame_rate", "r_frame_rate"):
        v = stream.get(key)
        if v and v != "0/0":
            try:
                return float(Fraction(v))
            except Exception:
                pass
    return None

def _pick_container(format_name: str, src: str) -> str:
    # ffprobe 的 format_name 可能是 "mov,mp4,m4a,3gp,3g2,mj2"
    if format_name:
        return format_name.split(",")[0]
    # 兜底：用扩展名
    path = urlparse(src).path
    ext = os.path.splitext(path)[1].lower().strip(".")
    return ext or "unknown"

def get_video_metadata(src: str) -> dict:
    """
    返回：
    {
      "resolution": {"width": int, "height": int},
      "container": str,           # e.g. "mp4"
      "size": int,                # 字节数
      "duration": int,            # 秒，四舍五入
      "frameRate": int,           # fps，四舍五入
      "frameCount": int           # 估算或读取的整数帧数
    }
    """
    if not shutil.which("ffprobe"):
        raise RuntimeError("未找到 ffprobe，请先安装 FFmpeg。")

    # -v error：仅错误输出；-of json：JSON 输出
    # 取 format（容器/大小/时长）与 stream（分辨率/帧率/帧数）
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries",
        "format=duration,size,format_name:stream=width,height,nb_frames,avg_frame_rate,r_frame_rate",
        "-select_streams", "v:0",
        "-of", "json",
        src,
    ]
    out = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
    info = json.loads(out.decode("utf-8", "ignore"))

    fmt = info.get("format", {}) or {}
    streams = info.get("streams", []) or []
    v = streams[0] if streams else {}

    width = int(v.get("width") or 0)
    height = int(v.get("height") or 0)
    fps = _parse_fps(v)
    # nb_frames 可能为字符串或缺失（可变帧率常见）
    nb_frames_raw = v.get("nb_frames")
    try:
        nb_frames = int(nb_frames_raw) if nb_frames_raw not in (None, "N/A", "") else None
    except Exception:
        nb_frames = None

    # 时长（优先 format.duration，float 秒）
    try:
        duration_sec = float(fmt.get("duration")) if fmt.get("duration") not in (None, "N/A", "") else None
    except Exception:
        duration_sec = None

    # 文件大小（字节）
    try:
        size_bytes = int(fmt.get("size")) if fmt.get("size") not in (None, "N/A", "") else None
    except Exception:
        size_bytes = None

    # 对于本地文件，size 用 os.path.getsize 更靠谱
    if size_bytes is None and os.path.exists(src):
        size_bytes = os.path.getsize(src)

    # 估算缺失字段
    if duration_sec is None and (nb_frames is not None and fps):
        duration_sec = nb_frames / fps
    if nb_frames is None and (duration_sec is not None and fps):
        nb_frames = int(round(duration_sec * fps))

    # 整数化输出（Topaz 示例里都是整数）
    duration_i = int(round(duration_sec)) if duration_sec is not None else 0
    fps_i = int(round(fps)) if fps else 0
    frames_i = int(nb_frames) if nb_frames is not None else (duration_i * fps_i if duration_i and fps_i else 0)
    size_i = int(size_bytes) if size_bytes is not None else 0

    container = _pick_container(fmt.get("format_name", ""), src)

    return {
        "resolution": {"width": width, "height": height},
        "container": container,
        "size": size_i,
        "duration": duration_i,
        "frameRate": fps_i,
        "frameCount": frames_i
    }

# 示例：
if __name__ == "__main__":
    # 本地文件
    print(get_video_metadata("input.mp4"))
    # 远程 URL（ffprobe 支持 http/https；若 403/鉴权需额外 header，可先下载再探测）
    # print(get_video_metadata("https://example.com/video.mp4"))