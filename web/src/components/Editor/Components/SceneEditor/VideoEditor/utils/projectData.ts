/**
 * 项目数据处理模块
 * 
 * 提供视频编辑项目的数据序列化和反序列化功能，
 * 用于项目的保存和加载
 * 
 * 主要功能：
 * - 项目数据生成（generateProjectData）
 * - 项目数据加载（loadProjectData）
 * - 媒体素材序列化（serializeMediaItem）
 * - 媒体素材反序列化（deserializeMediaItem）
 * 
 * 注意：
 * - File对象不能直接序列化，需要转换为URL或base64
 * - 所有坐标基于标准画布尺寸
 * - 支持多种画布比例（16:9, 9:16, 1:1）
 */

import { MediaItem, TimelineClip } from "../types";

/**
 * 项目数据接口
 * 
 * 表示一个完整的视频编辑项目的所有数据
 */
export interface ProjectData {
  /** 数据版本号（用于兼容性检查） */
  version: string;
  /** 项目名称 */
  projectName: string;
  /** 创建时间（ISO格式） */
  createdAt: string;
  /** 最后更新时间（ISO格式） */
  updatedAt: string;

  /** 素材数据（序列化格式） */
  mediaItems: SerializableMediaItem[];

  /** 时间轴片段数据 */
  clips: TimelineClip[];

  /** 画布配置 */
  canvas: {
    /** 画布宽度 */
    width: number;
    /** 画布高度 */
    height: number;
    /** 背景颜色 */
    backgroundColor: string;
    /** 画布比例 */
    ratio: string; // "16:9" | "9:16" | "1:1"
  };

  /** 时间轴配置 */
  timeline: {
    /** 时间轴缩放比例（1-10） */
    scale: number;
    /** 当前播放时间（秒） */
    currentTime: number;
    /** 项目总时长（秒） */
    duration: number;
  };

  /** 编辑器状态 */
  editor: {
    /** 选中的片段ID */
    selectedClipId: string | null;
    /** 播放状态 */
    playState: 'playing' | 'paused';
  };
}

/**
 * 标准画布尺寸常量
 * 
 * 定义不同比例的标准画布尺寸，所有片段的坐标和尺寸都基于此标准
 */
export const STANDARD_CANVAS_SIZES = {
  /** 16:9横屏（1920x1080，Full HD） */
  "16:9": { width: 1920, height: 1080 },
  /** 9:16竖屏（1080x1920，适合移动端） */
  "9:16": { width: 1080, height: 1920 },
  /** 1:1方形（1080x1080，适合社交媒体） */
  "1:1": { width: 1080, height: 1080 },
} as const;

/**
 * 可序列化的媒体素材接口
 * 
 * File对象不能直接序列化为JSON，需要转换为可序列化的格式
 */
export interface SerializableMediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'text';
  url: string; // URL或base64
  duration?: number;  // 视频时长（秒）
  thumbnail?: string; // 视频第一帧封面图 (base64)
  waveform?: string; // 音频波形图 URL (base64 或 blob URL)
  width?: number; // 素材原始宽度
  height?: number; // 素材原始高度
  text?: string; // 文字内容
  // 不保存 file 对象，改为保存文件的元数据
  fileInfo?: {
    name: string;
    type: string;
    size: number;
  };
}

/**
 * 将MediaItem转换为可序列化格式
 */
export const serializeMediaItem = async (item: MediaItem): Promise<SerializableMediaItem> => {
  const serializable: SerializableMediaItem = {
    id: item.id,
    name: item.name || "",
    type: item.type,
    url: item.url || "",
    duration: formatNumber(item.duration),
    thumbnail: item.thumbnail, // 保存 thumbnail 字段
    waveform: item.waveform, // 保存 waveform 字段
    width: formatNumber(item.width),
    height: formatNumber(item.height),
    text: item.text, // 保存 text 字段
  };

  // 保存文件元数据
  if (item.file) {
    serializable.fileInfo = {
      name: item.file.name,
      type: item.file.type,
      size: item.file.size,
    };
  }

  // 如果URL是blob URL，转换为base64
  if (item.url && item.url.startsWith('blob:')) {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      serializable.url = base64;
    } catch (error) {
      console.warn('无法转换blob URL为base64:', error);
    }
  }

  return serializable;
};

/**
 * 将可序列化格式转换回MediaItem
 */
export const deserializeMediaItem = (item: SerializableMediaItem): MediaItem => {
  // 创建一个空的File对象作为占位符
  const file = item.fileInfo
    ? new File([], item.fileInfo.name, { type: item.fileInfo.type })
    : new File([], 'placeholder.txt');

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    url: item.url,
    file: file,
    duration: item.duration,
    thumbnail: item.thumbnail, // 保留 thumbnail 字段
    waveform: item.waveform, // 保留 waveform 字段
    width: item.width,
    height: item.height,
    text: item.text, // 恢复 text 字段
  };
};

/**
 * 保存项目数据
 */
export const saveProjectData = async (
  projectName: string,
  mediaItems: MediaItem[],
  clips: TimelineClip[],
  canvas: ProjectData['canvas'],
  timeline: ProjectData['timeline'],
  editor: ProjectData['editor']
): Promise<ProjectData> => {
  // 序列化素材
  const serializedMediaItems = await Promise.all(
    mediaItems.map(item => serializeMediaItem(item))
  );

  // 格式化 clips 数据
  const formattedClips = clips.map(clip => ({
    ...clip,
    start: formatNumber(clip.start),
    end: formatNumber(clip.end),
    trimStart: formatNumber(clip.trimStart),
    trimEnd: formatNumber(clip.trimEnd),
    x: formatNumber(clip.x),
    y: formatNumber(clip.y),
    width: formatNumber(clip.width),
    height: formatNumber(clip.height),
    rotation: formatNumber(clip.rotation),
    scale: formatNumber(clip.scale),
    opacity: formatNumber(clip.opacity),
    volume: formatNumber(clip.volume),
    speed: formatNumber(clip.speed),
    // 格式化 textStyle 中的数值
    textStyle: clip.textStyle ? {
      ...clip.textStyle,
      fontSize: formatNumber(clip.textStyle.fontSize),
      strokeWidth: formatNumber(clip.textStyle.strokeWidth),
      shadowOffsetX: formatNumber(clip.textStyle.shadowOffsetX),
      shadowOffsetY: formatNumber(clip.textStyle.shadowOffsetY),
      shadowBlur: formatNumber(clip.textStyle.shadowBlur),
    } : undefined,
    // 格式化 mediaStyle 中的数值
    mediaStyle: clip.mediaStyle ? {
      ...clip.mediaStyle,
      borderRadius: formatNumber(clip.mediaStyle.borderRadius),
      brightness: formatNumber(clip.mediaStyle.brightness),
      blur: formatNumber(clip.mediaStyle.blur),
      outlineWidth: formatNumber(clip.mediaStyle.outlineWidth),
      shadowOffsetX: formatNumber(clip.mediaStyle.shadowOffsetX),
      shadowOffsetY: formatNumber(clip.mediaStyle.shadowOffsetY),
      shadowBlur: formatNumber(clip.mediaStyle.shadowBlur),
    } : undefined,
    // 格式化 cropArea 中的数值
    cropArea: clip.cropArea ? {
      ...clip.cropArea,
      x: formatNumber(clip.cropArea.x),
      y: formatNumber(clip.cropArea.y),
      width: formatNumber(clip.cropArea.width),
      height: formatNumber(clip.cropArea.height),
    } : undefined,
  }));

  // 格式化 timeline 数据
  const formattedTimeline = {
    ...timeline,
    currentTime: formatNumber(timeline.currentTime),
    duration: formatNumber(timeline.duration),
  };

  const projectData: ProjectData = {
    version: '1.0.0',
    projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mediaItems: serializedMediaItems,
    clips: formattedClips,
    canvas: canvas,
    timeline: formattedTimeline,
    editor: editor,
  };

  return projectData;
};

/**
 * 加载项目数据
 */
export const loadProjectData = (projectData: ProjectData, targetCanvasSize?: { width: number; height: number }): {
  mediaItems: MediaItem[];
  clips: TimelineClip[];
  canvas: ProjectData['canvas'];
  timeline: ProjectData['timeline'];
  editor: ProjectData['editor'];
} => {
  // 反序列化素材
  const mediaItems = projectData?.mediaItems?.map(item => deserializeMediaItem(item)) || [];

  // 获取源画布尺寸
  const sourceCanvasSize = {
    width: projectData.canvas?.width || 1920,
    height: projectData.canvas?.height || 1080
  };

  // 为旧项目的 clips 自动添加 type 字段（兼容性处理）
  let clips = projectData?.clips?.map(clip => {
    if (!clip.type) {
      // 通过 mediaId 查找对应的 MediaItem 获取类型
      const media = mediaItems.find(item => item.id === clip.mediaId);
      return {
        ...clip,
        type: media?.type || 'video' // 默认为 video
      };
    }
    return clip;
  }) || [];

  // 如果指定了目标尺寸且与源尺寸不同，需要转换坐标
  if (targetCanvasSize &&
    (targetCanvasSize.width !== sourceCanvasSize.width ||
      targetCanvasSize.height !== sourceCanvasSize.height)) {
    const scaleX = targetCanvasSize.width / sourceCanvasSize.width;
    const scaleY = targetCanvasSize.height / sourceCanvasSize.height;

    clips = clips.map(clip => ({
      ...clip,
      x: clip.x !== undefined ? clip.x * scaleX : undefined,
      y: clip.y !== undefined ? clip.y * scaleY : undefined,
      width: clip.width !== undefined ? clip.width * scaleX : undefined,
      height: clip.height !== undefined ? clip.height * scaleY : undefined,
    }));
  }

  return {
    mediaItems,
    clips,
    canvas: projectData.canvas || { width: 1920, height: 1080, backgroundColor: "#000000", ratio: "16:9" },
    timeline: projectData.timeline || { scale: 8, currentTime: 0, duration: 30 },
    editor: projectData.editor || { selectedClipId: null, playState: "paused" },
  };
};

/**
 * 导出项目为JSON文件
 */
export const exportProjectAsJSON = async (
  projectName: string,
  mediaItems: MediaItem[],
  clips: TimelineClip[],
  canvas: ProjectData['canvas'],
  timeline: ProjectData['timeline'],
  editor: ProjectData['editor']
) => {
  const projectData = await saveProjectData(projectName, mediaItems, clips, canvas, timeline, editor);
  const jsonString = JSON.stringify(projectData, null, 2);
  
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 从JSON文件导入项目
 */
export const importProjectFromJSON = (file: File): Promise<ProjectData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const projectData = JSON.parse(text) as ProjectData;

        // 验证数据格式
        if (!projectData.version || !projectData.mediaItems || !projectData.clips) {
          throw new Error('无效的项目文件格式');
        }

        resolve(projectData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsText(file);
  });
};

/**
 * 将Blob转换为Base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * 格式化数值，保留最多两位小数
 * 
 * @param value - 数值
 * @returns 格式化后的数值，如果不是数字则返回原值
 */
function formatNumber(value: number): number;
function formatNumber(value: undefined): undefined;
function formatNumber(value: number | undefined): number | undefined;
function formatNumber(value: number | undefined): number | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== 'number') {
    return value;
  }
  // 如果是整数，直接返回
  if (Number.isInteger(value)) {
    return value;
  }
  // 浮点数使用 toFixed(2) 保留两位小数，然后转回数字
  return Number(value.toFixed(2));
}

