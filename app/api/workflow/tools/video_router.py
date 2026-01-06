# from fastapi import APIRouter, Body
# from fastapi import File, UploadFile, Path,Form
# from fastapi.responses import JSONResponse
# from app.utils.core import get_user_id
# from app.locales.translations import get_translation

# from app.utils.file_utils import write_file_base64
# from fastapi.encoders import jsonable_encoder
# from app.common.httpx_client import httpx_client
# from typing import Mapping, Optional, Tuple, Dict, Any,Union,Sequence, List
# from app.api.workflow.tools.model.video_editor_model import VideoEditorRequest,ExportOptions,TimelineClip,MediaItem,CropArea
# import math
# from decimal import Decimal, ROUND_HALF_UP
# import logging
# import skia
# from app.api.workflow.tools.video_utils import load_video,grab_frame_for_clip_time_precise
# import re
# from app.api.workflow.tools.font_utils import load_font
# import contextlib
# import asyncio
# import av, io, os
# from app.cdn.aliyun_oss import aliyun_oss_instance
# from app.common.biz_response import BizCode
# # 进程池示例（最少依赖）
# from concurrent.futures import ProcessPoolExecutor

# video_tools_router = APIRouter(
#     prefix='/tools/videos',
#     tags=['/tools/videos']
# )

# def _parse_css_color(s: Optional[str]) -> int:
#     """支持 #rgb/#rrggbb/#aarrggbb 与 rgb()/rgba()。未识别返回透明。"""
#     if not s:
#         return skia.ColorSetARGB(0, 0, 0, 0)
#     s = s.strip().lower()
#     m = re.match(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)', s)
#     if m:
#         r, g, b = map(int, m.group(1, 2, 3))
#         a = int(float(m.group(4)) * 255) if m.group(4) is not None else 255
#         return skia.ColorSetARGB(a, r, g, b)
#     if s.startswith('#'):
#         h = s[1:]
#         if len(h) == 3:
#             r, g, b = (int(ch * 2, 16) for ch in h)
#             return skia.ColorSetARGB(255, r, g, b)
#         if len(h) == 6:
#             r = int(h[0:2], 16); g = int(h[2:4], 16); b = int(h[4:6], 16)
#             return skia.ColorSetARGB(255, r, g, b)
#         if len(h) == 8:  # AARRGGBB
#             a = int(h[0:2], 16); r = int(h[2:4], 16); g = int(h[4:6], 16); b = int(h[6:8], 16)
#             return skia.ColorSetARGB(a, r, g, b)
#     return skia.ColorSetARGB(0, 0, 0, 0)

# def _brightness_filter(percent) -> skia.ColorFilter:
#     f = percent / 100.0
#     return skia.ColorFilters.Matrix([
#         f, 0, 0, 0, 0,
#         0, f, 0, 0, 0,
#         0, 0, f, 0, 0,
#         0, 0, 0, 1, 0,
#     ])


# def _image_from_bytes(data: bytes) -> skia.Image:
#     d = skia.Data.MakeWithoutCopy(data)
#     img = skia.Image.MakeFromEncoded(d)
#     if img is None:
#         raise ValueError("Unsupported or corrupt image data")
#     return img

# async def load_image(url: str) -> skia.Image:
#     default_headers = {"User-Agent": "skia-image-loader/1.0"}
#     response = await httpx_client.run_with_retries(
#         do_request=lambda cli: cli.get(url,headers=default_headers)
#     )
#     return _image_from_bytes(response.content)

# def parse_export_settings(options: Optional[ExportOptions] = None) -> Tuple[int, int, Dict[str, int], int, int]:
#     resolution = options.resolution if options and options.resolution else "1920x1080"
#     w_str, h_str = resolution.split("x", 1)
#     width, height = int(w_str), int(h_str)
#     if width <= 0 or height <= 0:
#         raise ValueError(f"Invalid resolution format: {resolution}")
#     canvas_size = {"width": width, "height": height}

#     fps = options.frame_rate if options and options.frame_rate else 30
#     audio_sample_rate = options.audio_sample_rate if options and options.audio_sample_rate else 44100
#     return width, height, canvas_size, fps, audio_sample_rate

# def get_base_canvas_size(canvas_ratio: str) -> Dict[str, int]:
#     match canvas_ratio:
#         case "16:9":
#             return { "width": 1920, "height": 1080 }
#         case "9:16":
#             return { "width": 1080, "height": 1920 }
#         case "1:1":
#             return { "width": 1080, "height": 1080 }
#         case _:
#             # 默认使用 16:9
#             return { "width": 1920, "height": 1080 }


# def get_visible_clips(clips: List[TimelineClip], current_time: float) -> List[TimelineClip]:
#     # 过滤：start <= current_time < end
#     filtered = [
#         c for c in clips
#         if c.start is not None and c.end is not None
#         and current_time >= c.start and current_time < c.end
#     ]

#     # 排序：按 track_index 降序；None 视为 -∞（排到最后）
#     return sorted(
#         filtered,
#         key=lambda c: (c.track_index if c.track_index is not None else float("-inf")),
#         reverse=True,
#     )
# def wrap_lines_skia(text: str, width: float, font: skia.Font) -> list[str]:
#     raw_lines = text.split('\n')
#     lines: list[str] = []

#     for raw in raw_lines:
#         if raw == '':
#             # 空行也要保留
#             lines.append('')
#             continue

#         current = ''
#         for ch in raw:                         # 逐“字符”累加
#             test = current + ch
#             w = font.measureText(test)         # 等价于 ctx.measureText(test).width
#             if w > width and current != '':
#                 # 超过宽度，当前行结束；新行从这个字符开始
#                 lines.append(current)
#                 current = ch
#             else:
#                 current = test

#         if current != '':
#             lines.append(current)

#     return lines
# # Canvas 的 shadowBlur 到 Skia 的 sigma 的近似换算
# def blur_to_sigma(shadow_blur: float) -> float:
#     # Skia 内部常用的近似：sigma ≈ radius * 0.57735 + 0.5
#     return 0 if shadow_blur <= 0 else (shadow_blur * 0.57735 + 0.5)

# def apply_canvas_shadow(paint: skia.Paint, shadow_color: str,
#                         shadow_offset_x: float = 0.0, shadow_offset_y: float = 0.0,
#                         shadow_blur: float = 0.0):
#     if not shadow_color and shadow_blur <= 0:
#         return
#     sigma = blur_to_sigma(shadow_blur)
#     # 和 Canvas 语义一致：在原图下方生成一层偏移+模糊的有色阴影，再与原图一起输出
#     filt = skia.ImageFilters.DropShadow(
#         dx=shadow_offset_x, dy=shadow_offset_y,
#         sigmaX=sigma, sigmaY=sigma,
#         color=_parse_css_color(shadow_color),
#         input=None
#     )
#     paint.setImageFilter(filt)

# def compute_draw_x(text_align: str, container_w: float, line: str, font: skia.Font) -> float:
#     ta = (text_align or "center").lower()
#     if ta == "left":
#         return -container_w / 2.0
#     w = font.measureText(line)
#     if ta == "right":
#         return container_w / 2.0 - w
#     return -w / 2.0

# async def render_single_text_clip(ctx,font,rotation,scale,opacity,clip: TimelineClip,canvas_size: Dict[str, int]):
#     text_style =   clip.text_style if clip.text_style else {}
#     text = clip.text if clip.text else "Text"
#     if text_style.text_transform:
#         if text_style.text_transform == 'uppercase':
#             text = text.upper()
#         elif text_style.text_transform == 'lowercase':
#             text = text.lower()
#         elif text_style.text_transform == 'capitalize':
#             text = re.sub(r'\b\w', lambda m: m.group(0).upper(), text, flags=re.ASCII)
    
#     width =  clip.width if clip.width else 120;
#     height = clip.height if clip.height else 40;

#     # 计算元素中心点坐标（从左上角坐标转换）
#     x = clip.x if clip.x else (canvas_size["width"] - width) / 2
#     y = clip.y if clip.y else (canvas_size["height"] - height) / 2
#     center_X = x + width / 2
#     center_Y = y + height / 2

#     # 应用变换（平移到中心点、旋转、缩放）- 对应外层容器的 transform
#     ctx.translate(center_X, center_Y)         # 平移到中心
#     ctx.rotate(rotation)      # 角度制
#     ctx.scale(scale, scale)

#     font_size = text_style.font_size if text_style.font_size else 48
    
#     # 设定填充色

#     font_color = text_style.color if text_style.color else "#ffffff";
#     fill_paint = skia.Paint(AntiAlias=True)
#     fill_paint.setColor(_parse_css_color(font_color))

#     # 阴影参数
#     shadow_color   = text_style.shadow_color if text_style.shadow_color else None
#     shadow_offset_x = text_style.shadow_offset_x if text_style.shadow_offset_x else 0
#     shadow_offset_y = text_style.shadow_offset_y if text_style.shadow_offset_y else 0
#     shadow_blur    = text_style.shadow_blur if text_style.shadow_blur else 0
#     apply_canvas_shadow(fill_paint, shadow_color, shadow_offset_x, shadow_offset_y, shadow_blur)

#     # 对齐
#     text_align = text_style.text_align if text_style.text_align else 'center'

#     # top → baseline 的换算（Skia 以基线作 y）
#     metrics = font.getMetrics()           # ascent<0, descent>0
#     ascent = metrics.fAscent              # 负数
    
#     # raw_lines = text.split('\n')
#     lines: list[str] = wrap_lines_skia(text=text,width=width,font=font)


#     # 行高为字号的1.6倍
#     line_height = font_size * 1.6
    
#     total_text_height = len(lines) * line_height
#     # 垂直居中
#     start_y_top = -total_text_height / 2

#     stroke_paint = None
#     stroke_color = text_style.stroke_color if text_style.stroke_color else None
#     stroke_width = text_style.stroke_width if text_style.stroke_width else 0
#     if stroke_color and stroke_width > 0:
#         stroke_paint = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style)
#         stroke_paint.setColor(_parse_css_color(stroke_color))
#         stroke_paint.setStrokeWidth(float(stroke_width) * 2.0)  # Canvas 描边居中 → 乘2
#         stroke_paint.setStrokeJoin(skia.Paint.kRound_Join)
#         stroke_paint.setStrokeMiter(2)
#         apply_canvas_shadow(stroke_paint, shadow_color, shadow_offset_x, shadow_offset_y, shadow_blur)
    
#      # 装饰线
#     text_decoration = (text_style.text_decoration or 'none').strip().lower()
#     decorations = [d for d in text_decoration.split(' ') if d and d != 'none']
#     deco_line_width = max(1.5, font_size * 0.06)

#     # 应用透明度
#     # ctx.globalAlpha = opacity
#     # globalAlpha：用图层一次性应用
#     alpha_layer = skia.Paint()
#     alpha_layer.setAlphaf(max(0.0, min(1.0, opacity)))
#     ctx.saveLayer(paint=alpha_layer)

#     try:
#         for i, line in enumerate(lines):
#             y_top  = start_y_top + i * line_height
#             y_base = y_top - ascent
#             x_left = compute_draw_x(text_align, width, line, font)
#             # 先描边
#             if stroke_paint is not None:
#                 ctx.drawString(line, x_left, y_base, font, stroke_paint)
#             # 再填充
#             ctx.drawString(line, x_left, y_base, font, fill_paint)

#              # 装饰线（不加阴影，跟你 JS 的 ctx.shadow 置透明一致）
#             if decorations:
#                 text_w = font.measureText(line)

#                 line_paint = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style)
#                 # 有描边则用描边色；否则用文字色
#                 line_color = stroke_color if stroke_color and stroke_width > 0 else font_color
#                 line_paint.setColor(_parse_css_color(line_color))
#                 line_paint.setStrokeWidth(deco_line_width)

#                 for d in decorations:
#                     if d == 'underline':
#                         # 你的 JS：currentY + fontSize * 0.85
#                         y_line = y_top + font_size * 0.85
#                     elif d == 'line-through':
#                         # 你的 JS：currentY + fontSize * 0.5
#                         y_line = y_top + font_size * 0.5
#                     elif d == 'overline':
#                         # 你的 JS：currentY - fontSize * 0.15
#                         y_line = y_top - font_size * 0.15
#                     else:
#                         continue
#                     ctx.drawLine(x_left, y_line, x_left + text_w, y_line, line_paint)
#     finally:
#         ctx.restore()

# async def render_single_image_clip(ctx,img,rotation,scale,opacity, clip: TimelineClip,media: MediaItem,canvas_size: Dict[str, int]):

#     width =  clip.width if clip.width else img.width()
#     height = clip.height if clip.height else img.height()
#     crop_area = clip.crop_area
#     # 计算元素左上角坐标和中心点坐标
#     x = clip.x if clip.x  is not None else (canvas_size["width"] - width) / 2
#     y = clip.y if clip.y  is not None else (canvas_size["height"] - height) / 2
#     center_X = x + width / 2
#     center_Y = y + height / 2

#     # 应用变换（平移到中心点、旋转、缩放）- 对应外层容器的 transform
#     ctx.translate(center_X, center_Y)         # 平移到中心
#     ctx.rotate(rotation)      # 角度制
#     ctx.scale(scale, scale)

#     """
#     复刻前端逻辑：
#       1) 阴影（通过绘制形状，只画阴影）
#       2) 圆角裁剪
#       3) 透明度与滤镜（blur/brightness）
#       4) 绘制图片（可选裁剪，目标矩形居中）
#       5) 轮廓描边（不受滤镜影响）
#     约定：当前坐标原点已在元素中心，旋转/缩放已在外层做完。
#     """
#     media_style = clip.media_style if clip.media_style else {}

#     rect_dst = skia.Rect.MakeXYWH(-width/2.0, -height/2.0, width, height)
   

#     # ---- 读取样式 ----
#     shadow_color_s =  media_style.shadow_color if media_style and media_style.shadow_color else None
#     shadow_blur    =  media_style.shadow_blur if media_style and media_style.shadow_blur else 0
#     shadow_dx      =  media_style.shadow_offset_x if media_style and media_style.shadow_offset_x else 0
#     shadow_dy      =  media_style.shadow_offset_y if media_style and media_style.shadow_offset_y else 0
#     border_radius  =  media_style.border_radius if media_style and media_style.border_radius else 0

#     blur_px = media_style.blur if  media_style and media_style.blur else 0
#     brightness_pct = media_style.brightness if  media_style and media_style.brightness else 100
    
#     # brightness_pct = float(media_style.get('brightness', default=100) or 100)

#     outline_color_s =  media_style.outline_color if media_style and media_style.outline_color else '#000000'
#     outline_width   =  media_style.outline_width if media_style and media_style.outline_width else 0

#     # ---- 1) 阴影：只画阴影，不画实体 ----
#     if shadow_color_s and shadow_blur > 0:
#         path = skia.Path()
#         if border_radius > 0:
#             r = min(border_radius, width/2.0, height/2.0)
#             path.addRRect(skia.RRect.MakeRectXY(rect_dst, r, r))
#         else:
#             path.addRect(rect_dst)

#         sigma = shadow_blur  # 如需更贴近 Canvas，可设 sigma = shadow_blur * 0.55
#         sp = skia.Paint()
#         sp.setImageFilter(
#             skia.ImageFilters.DropShadowOnly(
#                 shadow_dx, shadow_dy, sigma, sigma, _parse_css_color(shadow_color_s)
#             )
#         )
#         ctx.drawPath(path, sp)

#     # ---- 2) 圆角裁剪（可选） ----
#     did_clip = False
#     if border_radius > 0:
#         r = min(border_radius, width/2.0, height/2.0)
#         # ctx.save()
#         did_clip = True
#         ctx.clipRRect(skia.RRect.MakeRectXY(rect_dst, r, r), doAA=True)

#     # ---- 3) 透明度 + 滤镜（对后续图片生效） ----
#     alpha_layer = skia.Paint()
#     alpha_layer.setAlphaf(max(0.0, min(1.0, opacity)))
#     ctx.saveLayer(paint=alpha_layer)

#     img_paint = skia.Paint(AntiAlias=True)
#     if blur_px > 0:
#         sigma = blur_px  # 可调 0.55 系数
#         img_paint.setImageFilter(skia.ImageFilters.Blur(sigma, sigma))
#     if brightness_pct != 100:
#         img_paint.setColorFilter(_brightness_filter(brightness_pct))

#     sampling = skia.SamplingOptions(skia.FilterMode.kLinear)

#     # ---- 4) 绘制图片（支持裁剪） ----
    
#     if crop_area and media.width and media.height:
#         actual_w = img.width() if img.width() else media.width
#         actual_h = img.height() if img.height() else media.height
#         mw, mh = media.width, media.height
#         scale_x = actual_w / mw  
#         scale_y = actual_h / mh
        
#         cx =  crop_area.x * scale_x
#         cy =  crop_area.y * scale_y
#         cw =  crop_area.width * scale_x
#         ch =  crop_area.height * scale_y

#         src = skia.Rect.MakeXYWH(cx, cy, cw, ch)
#         ctx.drawImageRect(img, src, rect_dst, sampling, paint=img_paint)
#     else:
#         # 无裁剪：直接等比拉伸到目标矩形
#         ctx.drawImageRect(img, rect_dst, sampling, paint=img_paint)
    
#     ctx.restore()

#     # ---- 5) 轮廓描边（不受滤镜影响） ----
#     if outline_color_s and outline_width > 0:
#         stroke = skia.Paint(
#             AntiAlias=True,
#             Style=skia.Paint.kStroke_Style,
#             StrokeWidth=outline_width,
#             Color=_parse_css_color(outline_color_s),
#         )
#         if border_radius > 0:
#             r = min(border_radius, width/2.0, height/2.0)
#             ctx.drawRRect(skia.RRect.MakeRectXY(rect_dst, r, r), stroke)
#         else:
#             ctx.drawRect(rect_dst, stroke)

   


# async def render_frame(
#     ctx: skia.Canvas,
#     clips: List[TimelineClip],
#     media_items: List[MediaItem],
#     current_time,
#     canvas_size,
#     canvas_ratio,
#     image_cache: Dict[str, Any] = {},
#     video_cache: Dict[str, Any] = {},
#     text_cache: Dict[str, Any] = {},
# ) -> None:
#     base_size = get_base_canvas_size(canvas_ratio)
#     base_Width, base_height = base_size["width"], base_size["height"]
    
#     # 清空画布背景（#000000）
#     paint_bg = skia.Paint(AntiAlias=True, Color=skia.ColorBLACK)
#     ctx.drawRect(skia.Rect.MakeWH(canvas_size["width"], canvas_size["height"]), paint_bg)

#     ctx.save()
#     try:
#         # 等比例缩放（以宽度为基准）
#         scale = canvas_size["width"] / float(base_Width)
#         ctx.scale(scale, scale)
    
#         visible_clips: List[TimelineClip] = get_visible_clips(clips, current_time)
#         media_by_id = {m.id: m for m in media_items}
#         for clip in visible_clips: 
#             media = media_by_id.get(clip.media_id,None)
#             if not media or media.type == 'audio':
#                 continue
#             ctx.save()
#             rotation = math.radians( clip.rotation if clip.rotation else 0 )
#             scale =  clip.scale if clip.scale else 1
#             opacity = (   clip.opacity if clip.opacity else 100) / 100
#             try:
#                 if media.type == "image" and media.url:
#                     img = image_cache.get(media.url,None)
#                     if not img:
#                         img = await load_image(media.url)
#                         image_cache[media.url] = img
#                     await render_single_image_clip(ctx=ctx,img=img,rotation=rotation,scale=scale,opacity=opacity,clip=clip,media=media,canvas_size=canvas_size)
#                 elif media.type == "video" and media.url:
#                     video = video_cache.get(media.url,None)
#                     if not video:
#                         video = load_video(media.url)
#                         video_cache[media.url] = video
#                     trim_start = clip.trim_start if clip.trim_start else 0
#                     img = grab_frame_for_clip_time_precise(vr=video, current_time=current_time, clip_start=clip.start, trim_start=trim_start)
#                     await render_single_image_clip(ctx=ctx,img=img,rotation=rotation,scale=scale,opacity=opacity,clip=clip,media=media,canvas_size=canvas_size)
#                 elif media.type == "text":
#                     text_style =   clip.text_style 
#                     # 加载字体
#                     font_size = text_style.font_size if text_style.font_size else 48
#                     font_family = text_style.font_family if text_style.font_family else "Arial"
#                     font = text_cache.get(font_family+"_"+str(font_size))
#                     if not font:

#                         font = load_font(font_size=font_size, font_family=font_family)
#                         text_cache[font_family+"_"+str(font_size)] = font
                    
#                     await render_single_text_clip(ctx=ctx,font=font,rotation=rotation,scale=scale,opacity=opacity,clip=clip,canvas_size=canvas_size)
#             finally:
#                 ctx.restore()
#     finally:
#         ctx.restore()

# def calculate_bitrate(bpp,total_pixels,fps, codec_efficiency = 1.0) -> str:
#     # 基础码率 = 像素数 × 帧率 × BPP
#     bitrate_kbps = (total_pixels * fps * bpp) / 1000; # 转换为 Kbps
#     # 根据编码器效率调整
#     bitrate_kbps = bitrate_kbps * codec_efficiency
#     # 设置最小和最大码率
#     minBitrate = 500 # 最小 500 Kbps
#     maxBitrate = 100_000     # 最大 100 Mbps
#     bitrate_kbps = max(minBitrate, min(maxBitrate, bitrate_kbps))
#     # 转换为 Mbps（保留小数点后1位）
#     # const bitrateMbps = Math.round(bitrateKbps / 100) / 10;
#     bitrate_mbps = (Decimal(bitrate_kbps) / Decimal(1000)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
#     return f"{bitrate_mbps}M"


# def get_codec_efficiency(options: Optional[ExportOptions] = None):
#     codec_type = options.codec if options and options.codec else "libx264"
#     if codec_type in ["libx265", "libx265_alpha", "libx265_422"]:
#         return 0.6 # H.265 效率高约 40%，所以需要更低码率
#     elif codec_type == "libaom-av1":
#         return 0.5 # AV1 效率更高约 50%
#     return 1.0 # H.264 基准

# async def ffmeg_subprocess_exec(args):
#     return await asyncio.create_subprocess_exec(
#         *args,
#         stdin=asyncio.subprocess.PIPE,
#         stdout=asyncio.subprocess.PIPE,
#         stderr=asyncio.subprocess.PIPE,
#     )
# def build_audio_filter(i, clip, trim_start, trim_end, speed=1.0, volume=1.0):
#     # 起始：选择第 i+1 个输入的音频流
#     audio_filter = f"[{i + 1}:a]"

#     # 1) 裁剪 + 校正时间戳
#     audio_filter += f"atrim={trim_start:.3f}:{trim_end:.3f},asetpts=PTS-STARTPTS"

#     # 2) 调速（注意：FFmpeg 的 atempo 每段必须在 0.5~2.0 之间；超出范围需要分段串联）
#     if speed != 1.0:
#         if speed <= 0:
#             raise ValueError("speed 必须大于 0")
#         s = float(speed)
#         # 把总倍速拆成若干个 0.5~2.0 的因子
#         while s > 2.0:
#             audio_filter += ",atempo=2.0"
#             s /= 2.0
#         while s < 0.5:
#             audio_filter += ",atempo=0.5"
#             s /= 0.5
#         if abs(s - 1.0) > 1e-6:
#             audio_filter += f",atempo={s:.3f}"

#     # 3) 音量
#     if volume != 1.0:
#         audio_filter += f",volume={volume:.3f}"

#     # 4) 延迟到正确时间点（毫秒）；下面写法等价于你 JS 的 "x|x"（双声道）
#     if getattr(clip, "start", 0) > 0:
#         delay_ms = int(round(clip.start * 1000))
#         audio_filter += f",adelay={delay_ms}|{delay_ms}"
#         # 也可用对所有声道统一延迟的写法（更简洁）：
#         # audio_filter += f",adelay={delay_ms}:all=1"

#     # 输出打上标签，供后续引用
#     audio_filter += f"[a{i}]"
#     return audio_filter

# PROCESS_POOL = ProcessPoolExecutor(max_workers=os.cpu_count())

# @video_tools_router.post("/export")
# async def export(video_editor_request: VideoEditorRequest = Body(...)):
#     loop = asyncio.get_running_loop()
#     result = await loop.run_in_executor(PROCESS_POOL, sync_export_func, video_editor_request.model_dump(mode="python"))
#     return result

# def sync_export_func(serialized_request: dict) -> str:
#     """给 ProcessPoolExecutor 用的同步入口——在子进程里开 event loop 跑异步流程"""
#     req = VideoEditorRequest.model_validate(serialized_request)   # ← 关键
#     return asyncio.run(export_async(req))

# # @video_tools_router.post('/export')
# async def export_async(video_editor_request: dict):
#     """
#     导出视频
#     Args:
#         video_editor_request (VideoEditorRequest): 视频编辑请求参数
#     Returns:
#         JSONResponse: 包含导出视频任务ID的JSON响应
#     """
#     options: ExportOptions = video_editor_request.export_options
#     clips = video_editor_request.clips
#     canvas_ratio = video_editor_request.canvas_ratio
#     media_items = video_editor_request.media_items

#     width, height, canvas_size, fps, audio_sample_rate = parse_export_settings(options)

#     total_pixels = width * height
#     # bitrate = "5M"
#     bitrate_option = options.bitrate if options and options.bitrate else "recommended"
#     codec_efficiency = get_codec_efficiency(options)
    
#     if bitrate_option == "lower" :
#        # 低质量: 0.07 BPP（适合快速预览、社交媒体）
#        bitrate = calculate_bitrate(bpp=0.07, total_pixels=total_pixels, fps=fps, codec_efficiency=codec_efficiency)
#     elif bitrate_option == "recommended" :
#        # 推荐质量: 0.12 BPP（YouTube/Bilibili 标准）
#        bitrate = calculate_bitrate(bpp=0.12, total_pixels=total_pixels, fps=fps, codec_efficiency=codec_efficiency)
#     elif bitrate_option == "higher" :
#        # 高质量: 0.20 BPP（高品质归档、专业用途）
#        bitrate = calculate_bitrate(bpp=0.20, total_pixels=total_pixels, fps=fps, codec_efficiency=codec_efficiency)
#     else:
#        # 使用自定义码率
#        bitrate = bitrate_option
    

#     # 处理编码器
#     codec = options.codec if options and options.codec else "libx264"
#     pixel_format = "yuv420p"

#     if (codec == "libx265_alpha"):
#         codec = "libx265"
#         pixel_format = "yuva420p"
#     elif codec == "libx265_422" :
#         codec = "libx265"
#         pixel_format = "yuv422p"

#     # 处理音频质量
#     audio_quality = options.audio_quality if options and options.audio_quality else "aac_192"
#     audio_codec = "aac"
#     audio_bitrate = "192k"

#     if audio_quality == "aac_192":
#         audio_codec = "aac"
#         audio_bitrate = "192k"
#     elif audio_quality == "aac_256":
#         audio_codec = "aac"
#         audio_bitrate = "256k"
#     elif audio_quality == "aac_320":
#         audio_codec = "aac"
#         audio_bitrate = "320k"
#     elif audio_quality == "pcm":
#         audio_codec = "pcm_s16le"
#         audio_bitrate = "" # PCM 不需要码率参数
    
#     duration = max([c.end for c in clips]) if clips else 10

#     output_format = options.format if options and options.format else "MP4"

#     output_file = f"output.{output_format.lower()}"
    
#     # === 创建“画布”并获取 Canvas（等价 document.createElement + getContext("2d", { alpha: true })）===
#     info = skia.ImageInfo.Make(
#         canvas_size["width"], canvas_size["height"],
#         skia.ColorType.kBGRA_8888_ColorType,     # RGBA
#         skia.AlphaType.kPremul_AlphaType,         # alpha: true（预乘）
#     )
#     surface = skia.Surface.MakeRaster(info)
#     ctx = surface.getCanvas()
#     if ctx is None:
#         raise RuntimeError("无法创建 canvas 上下文")
#     # === 启用图像抗锯齿/高质量平滑（Skia 没有全局开关，后续绘制时传这些参数）===
#     # 用于位图采样（等价 imageSmoothingEnabled/Quality = 'high'）
#     IMAGE_SAMPLING = skia.SamplingOptions(
#         skia.FilterMode.kLinear,  # 线性过滤
#         skia.MipmapMode.kLinear   # mipmap，缩小时更干净
#     )
#     # === 计算总帧数（等价 Math.ceil(duration * fps)）===
#     total_frames = math.ceil(duration * fps)
#     logging.info(f"📹 总帧数: {total_frames}, 帧率: {fps}, 分辨率: {canvas_size['width']}x{canvas_size['height']}")
   
#     audio_clips = []
#     media_by_id = {m.id: m for m in media_items}
#     # 处理音频: 55% -> 60%
#     for clip in clips:
#         media = media_by_id.get(clip.media_id,None)
#         if media and (media.type == 'audio' or media.type == 'video'):
#             audio_clips.append(clip)

#     ffmpegArgs = [
#         "ffmpeg","-y",
#         "-f","rawvideo","-pix_fmt","bgra","-s",f"{width}x{height}","-r",f"{fps}",
#         "-i","-",
#     ]
#     audio_filter_complex_parts = []
#     for i, clip in enumerate(audio_clips):
#         #   m = mediaItems.find(item => item.id === clip.mediaId);
#         audio_media = next((item for item in media_items if item.id == clip.media_id), None)
#         if not audio_media: 
#             continue
#         ffmpegArgs += ["-reconnect","1","-reconnect_streamed","1","-reconnect_at_eof","1",
#              "-thread_queue_size","8192","-i", audio_media.url]

#         # 构建音频滤镜
#         trim_start = clip.trim_start if clip.trim_start else 0
#         audio_duration = audio_media.duration if audio_media.duration else duration

#         trim_end = clip.trim_end if clip.trim_end else audio_duration
#         volume = (clip.volume if clip.volume else 100) / 100
#         speed = clip.speed if clip.speed else 1
#         audio_filter = build_audio_filter(i=i, clip=clip,trim_start=trim_start,trim_end=trim_end,speed=speed,volume=volume)
#         audio_filter_complex_parts.append(audio_filter)

#     if len(audio_filter_complex_parts) > 0:
#         if len(audio_filter_complex_parts) == 1:
#             ffmpegArgs += ['-filter_complex', audio_filter_complex_parts[0],
#             '-map', '0:v', '-map', '[a0]',
#             '-c:a', audio_codec]
#         else:
#             mix_inputs = "".join(f"[a{i}]" for i, _ in enumerate(audio_filter_complex_parts))
#             filter_complex =";".join(audio_filter_complex_parts) + f";{mix_inputs}amix=inputs={len(audio_filter_complex_parts)}:duration=longest[aout]"
            
#             ffmpegArgs += [
#                 '-filter_complex', filter_complex,
#                 '-map', '0:v', '-map', '[aout]',
#                 '-c:a', audio_codec
#             ]
#         # 添加音频采样率
#         ffmpegArgs += ['-ar', str(audio_sample_rate)]

#         # 如果不是 PCM，添加音频码率
#         if audio_bitrate:
#             ffmpegArgs += ['-b:a', audio_bitrate]
            
#     ffmpegArgs += [
#         "-c:v", codec,
#         "-preset", "fast",
#         "-b:v", bitrate,
#         "-pix_fmt",pixel_format,
#         "-t", str(duration),
#         output_file
#     ]
#     abs_path = None
#     try:
#         proc = await ffmeg_subprocess_exec(ffmpegArgs)
#         row_bytes = info.minRowBytes()
#         buf = bytearray(row_bytes * height)
#         stderr_task = asyncio.create_task(proc.stderr.read())
#         image_cache = {}
#         video_cache = {}
#         text_cache = {}
#         # 渲染帧
#         for i in range(total_frames):
#             time = i / fps
#             await render_frame(ctx=ctx,clips= clips,media_items=media_items,current_time=time, canvas_size=canvas_size,canvas_ratio=canvas_ratio,image_cache=image_cache,video_cache=video_cache,text_cache=text_cache)
    
#             img = surface.makeImageSnapshot()
#             ok = img.readPixels(info, memoryview(buf), row_bytes, 0, 0)
#             if ok:
#                 try:
#                     proc.stdin.write(buf)
#                     # 避免管道堵塞（尤其在 Windows）
#                     await proc.stdin.drain()
#                 except (BrokenPipeError, ConnectionResetError):
#                     # FFmpeg 已关闭 stdin — 通常是它已报错或结束
#                     # err = await proc
#                     rc = await proc.wait()
#                     err = (await stderr_task).decode("utf-8","ignore")
#                     raise RuntimeError(f"FFmpeg closed stdin early (rc={rc}).\n{err}") from None
     
#         # 4) 结束输入并等待 ffmpeg
#         proc.stdin.close()
#         await proc.wait()
        
#         if proc.returncode != 0:
#             err = (await proc.stderr.read()).decode("utf-8", "ignore")
#             print(f"ffmpeg 失败：{err}")
#         abs_path = os.path.abspath(output_file)
#         oss_result = await aliyun_oss_instance.upload_file_from_local(extension=os.path.splitext(abs_path)[1].lower(),prefix="export",local_path=abs_path)
#         status = oss_result["status"]
#         if status != "success":
#             return JSONResponse(content={
#                 "code": BizCode.OSS_UPLOAD_FAILED.code,
#                 "data": "",
#                 "msg": BizCode.OSS_UPLOAD_FAILED.msg,
#             })
#         return JSONResponse(content={
#             "code": 0,
#             "data": jsonable_encoder(oss_result["resource_url"]),
#             "msg": "",
#         })
#     except Exception:
#         # 异常时确保 ffmpeg 被回收
#         with contextlib.suppress(Exception):
#             if proc.stdin and not proc.stdin.is_closing():
#                 proc.stdin.close()
#         with contextlib.suppress(Exception):
#             await proc.wait()
#         raise
#     finally:
#         if abs_path and os.path.exists(abs_path):
#             os.remove(abs_path)