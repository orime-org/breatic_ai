# from pydantic import BaseModel, Field, ConfigDict, AliasChoices
# from typing import Optional, Any, Dict, List
# from app.editor.node.base_text_node import TextBasedBlockModel
# from app.editor.node.base_image_node import ImageBasedBlockModel   
# from app.editor.node.base_audio_node import AudioBasedBlockModel 
# from app.editor.node.base_video_node import VideoBasedBlockModel 
# import re

# # 把 snake_case 转成 camelCase（首单词不大写）
# def to_camel(s: str) -> str:
#     return re.sub(r"_([a-zA-Z0-9])", lambda m: m.group(1).upper(), s)

# # 统一的基类：开启别名生成 & 允许用字段名赋值
# class CamelModel(BaseModel):
#     model_config = ConfigDict(
#         extra='forbid',
#         populate_by_name=True,      # 既可用字段名，也可用别名（驼峰）赋值
#         alias_generator=to_camel,   # 自动生成驼峰别名
#     )

# class CropArea(CamelModel):
#     model_config = ConfigDict(extra='forbid')  
#     # 裁剪区域 x 坐标（像素）
#     x: Optional[float] = None
#     # 裁剪区域 y 坐标（像素）
#     y: Optional[float] = None
#     # 裁剪区域宽度（像素）
#     width: Optional[float] = None
#     # 裁剪区域高度（像素）
#     height: Optional[float] = None
#     # 单位（px 或 %）
#     unit: Optional[str] = "px"
#     # SVG path 路径（用于 clip-path）
#     path: Optional[str] = None  

# class MediaStyle(CamelModel):
#     model_config = ConfigDict(extra='forbid')  
    
#     # 圆角
#     border_radius: Optional[int] = None
#     # 亮度 (0-200, 默认 100)
#     brightness: Optional[int] = 100
#     # 模糊 (0-100, 默认 0)
#     blur: Optional[int] = 0
    
#     # 轮廓颜色
#     outline_color: Optional[str] = None    
#     # 轮廓大小
#     outline_width: Optional[float] = None
#     # 阴影颜色
#     shadow_color: Optional[str] = None
#     # 阴影X偏移
#     shadow_offset_x: Optional[float] = None
#     # 阴影Y偏移
#     shadow_offset_y: Optional[float] = None
#     # 阴影模糊
#     shadow_blur: Optional[int] = None

# class TextStyle(CamelModel):
#     model_config = ConfigDict(extra='forbid')  
#     # 字体（组合名称，如 "Consolas-Bold"）
#     font_family: Optional[str] = None

#     font_weight: Optional[str] = None
#     # 字号
#     font_size: Optional[int] = None
#     # 颜色
#     color: Optional[str] = None
#     # 对齐
#     text_align: Optional[str] = None
#     # 装饰 (underline, line-through, overline)
#     text_decoration: Optional[str] = None
#     # 大小写 (none, uppercase, lowercase, capitalize)
#     text_transform: Optional[str] = None
#     # 阴影颜色
#     shadow_color: Optional[str] = None
#     # 阴影X偏移
#     shadow_offset_x: Optional[float] = None
#     # 阴影Y偏移
#     shadow_offset_y: Optional[float] = None
#     # 阴影模糊
#     shadow_blur: Optional[float] = None
#     # 描边颜色
#     stroke_color: Optional[str] = None
#     # 描边大小
#     stroke_width: Optional[float] = None
    

# class TimelineClip(CamelModel):
#     model_config = ConfigDict(extra='forbid')  
    
#     id: Optional[str] = None
#     media_id: Optional[str] = None
#     start: Optional[float] = None
#     end: Optional[float] = None
#     track_index: Optional[int] = None
#     trim_start: Optional[int] = None
#     trim_end: Optional[int] = None
#     width: Optional[float] = 0
#     height: Optional[float] = 0
#     x: Optional[float] = 0.0
#     y: Optional[float] = 0.0
#     rotation: Optional[float] = 0
#     scale: Optional[int] = 1
#     opacity: Optional[int] = 100
#     # 音量 (0-200, 默认 100)
#     volume: Optional[int] = 100
#     # 播放速度 (0.25-4, 默认 1)
#     speed: Optional[float] = 1
#     # 裁剪后的图片URL
#     cropped_url: Optional[str] = None
#       # 文本属性
#     text: Optional[str] = None
    
#     media_style: Optional[MediaStyle] = None
#     text_style: Optional[TextStyle] = None
#     crop_area: Optional[CropArea] = None
#     type: Optional[str] = None

# class MediaItem(CamelModel):
#     model_config = ConfigDict(extra='forbid')  
    
#     id: Optional[str] = None
#     name: Optional[str] = None
#     # 'video' | 'audio' | 'image' | 'text';
#     type: Optional[str] = None
#     url: Optional[str] = None
#     # file: Optional[Dict[str, Any]] = None
#     duration: Optional[float] = None
#     # # 视频第一帧封面图 (base64)
#     # thumbnail: Optional[str] = None
#     # # 音频波形图 URL (base64 或 blob URL)
#     # waveform: Optional[str] = None
#     width: Optional[float] = 0
#     height: Optional[float] = 0
#     text: Optional[str] = None


# class ExportOptions(CamelModel):
#     model_config = ConfigDict(extra='forbid')  
    
#     # 输出分辨率（如"1920x1080"），默认根据画布比例自动计算
#     resolution: Optional[str] = None
#     # 帧率（fps），默认30
#     frame_rate: Optional[int] = None
#     # 视频比特率（如"2M"、"5M"），默认"2M"
#     bitrate: Optional[str] = None
#     # 比特率模式（"cbr"固定或"vbr"可变），默认"cbr"
#     bitrate_mode: Optional[str] = None
#     # 视频编码器（如"libx264"），默认"libx264"
#     codec: Optional[str] = None
#     # 音频采样率（Hz），默认44100
#     audio_sample_rate: Optional[int] = None
#     # 音频质量（如"128k"），默认"128k"
#     audio_quality: Optional[str] = None
#     # 输出格式，默认"mp4"
#     format: Optional[str] = None

# class VideoEditorRequest(CamelModel):
#     model_config = ConfigDict(extra='forbid')  
    
#     clips: Optional[List[TimelineClip]] = None
#     media_items: Optional[List[MediaItem]] = None
#     canvas_ratio: Optional[str] = None
#     export_options: Optional[ExportOptions] = None