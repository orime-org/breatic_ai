export interface MediaItem {
  id: string;
  name?: string;
  type: 'video' | 'audio' | 'image' | 'text';
  url?: string;
  file?: File;
  duration?: number;
  thumbnail?: string; // 视频第一帧封面图 (base64)
  waveform?: string; // 音频波形图 URL (base64 或 blob URL)
  width?: number; // 素材原始宽度
  height?: number; // 素材原始高度
  // 文字模板预设内容（仅用于默认文字选项）
  text?: string;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  type?: 'video' | 'audio' | 'image' | 'text'; // 片段类型（冗余字段，便于快速访问）
  start: number; // 在时间轴上的开始位置
  end: number;   // 在时间轴上的结束位置
  trackIndex: number;
  trimStart?: number; // 素材裁剪开始时间（视频从第几秒开始播放）
  trimEnd?: number;   // 素材裁剪结束时间（视频播放到第几秒）
  // 文本属性
  text?: string; // 文本内容
  // 画布属性
  x?: number;      // 元素 X 坐标
  y?: number;      // 元素 Y 坐标
  width?: number;  // 元素宽度
  height?: number; // 元素高度
  rotation?: number;
  scale?: number;
  opacity?: number; // 不透明度 (0-100, 默认 100)
  // 裁剪属性（图片/视频）
  cropArea?: {
    x: number;      // 裁剪区域 x 坐标（像素）
    y: number;      // 裁剪区域 y 坐标（像素）
    width: number;  // 裁剪区域宽度（像素）
    height: number; // 裁剪区域高度（像素）
    unit: 'px';     // 单位
    path?: string;  // SVG path 路径（用于 clip-path）
  };
  croppedUrl?: string; // 裁剪后的图片URL
  // 音频/视频属性
  volume?: number; // 音量 (0-200, 默认 100)
  speed?: number;  // 播放速度 (0.25-4, 默认 1)

  // 文字样式属性
  textStyle?: {
    fontFamily?: string;      // 字体（组合名称，如 "Consolas-Bold"）
    fontSize?: number;        // 字号
    color?: string;           // 颜色
    textAlign?: string;       // 对齐
    textDecoration?: string;  // 装饰 (underline, line-through, overline)
    textTransform?: string;   // 大小写 (none, uppercase, lowercase, capitalize)
    strokeColor?: string;     // 描边颜色
    strokeWidth?: number;     // 描边大小
    shadowColor?: string;     // 阴影颜色
    shadowOffsetX?: number;   // 阴影X偏移
    shadowOffsetY?: number;   // 阴影Y偏移
    shadowBlur?: number;      // 阴影模糊
  };

  // 图片/视频样式属性
  mediaStyle?: {
    borderRadius?: number;    // 圆角
    brightness?: number;      // 亮度 (0-200, 默认 100)
    blur?: number;            // 模糊 (0-100, 默认 0)
    outlineColor?: string;    // 轮廓颜色
    outlineWidth?: number;    // 轮廓大小
    shadowColor?: string;     // 阴影颜色
    shadowOffsetX?: number;   // 阴影X偏移
    shadowOffsetY?: number;   // 阴影Y偏移
    shadowBlur?: number;      // 阴影模糊
  };
}

