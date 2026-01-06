/**
 * 自动保存Web Worker工具模块
 * 
 * 提供在独立线程中处理数据序列化和对比的功能，
 * 避免大型项目的数据处理阻塞主线程UI
 * 
 * 主要功能：
 * - 创建Web Worker实例
 * - 在Worker中生成数据快照
 * - 在Worker中对比数据变化
 * - 在Worker中准备项目保存数据
 * - 主线程辅助函数（用于降级场景）
 * 
 * Worker消息类型：
 * - GENERATE_SNAPSHOT：生成数据快照
 * - SNAPSHOT_READY：快照生成完成
 * - PREPARE_SAVE：准备保存数据
 * - SAVE_DATA_READY：保存数据准备完成
 * 
 * 性能优势：
 * - 大型项目（100+片段）时，快照生成不阻塞UI
 * - JSON序列化在Worker线程执行
 * - 主线程只负责发送/接收消息
 */

import { MediaItem, TimelineClip } from "../types";
import { ProjectData } from "./projectData";

/**
 * 创建自动保存Web Worker实例
 * 
 * 使用Blob创建内联Worker，不需要外部worker文件
 * 
 * Worker功能：
 * - 生成数据快照（JSON.stringify）
 * - 对比数据变化
 * - 准备项目保存数据
 * 
 * @returns Worker实例，如果创建失败返回null
 * 
 * @example
 * ```ts
 * const worker = createAutoSaveWorker();
 * if (worker) {
 *   worker.postMessage({
 *     type: 'GENERATE_SNAPSHOT',
 *     payload: { mediaItems, clips, canvasRatio, projectName }
 *   });
 * }
 * ```
 */
export function createAutoSaveWorker(): Worker | null {
  try {
    // 创建内联 Worker
    const workerCode = `
      /* eslint-disable no-restricted-globals */
      
      // 格式化数值，保留最多两位小数
      function formatNumber(value) {
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
      
      // 生成数据快照
      function generateDataSnapshot(data) {
        return JSON.stringify({
          mediaItems: data.mediaItems.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            url: item.url,
          })),
          clips: data.clips.map(clip => ({
            id: clip.id,
            mediaId: clip.mediaId,
            start: clip.start,
            end: clip.end,
            trackIndex: clip.trackIndex,
            x: clip.x,
            y: clip.y,
            width: clip.width,
            height: clip.height,
            text: clip.text,
          })),
          canvasRatio: data.canvasRatio,
          projectName: data.projectName,
        });
      }
      
      // 准备项目数据
      function prepareProjectData(data) {
        const { projectName, mediaItems, clips, canvas, timeline, ui } = data;
        
        return {
          version: "1.0",
          projectName: projectName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          canvas: {
            width: canvas.width,
            height: canvas.height,
            backgroundColor: canvas.backgroundColor,
            ratio: canvas.ratio,
          },
          timeline: {
            scale: timeline.scale,
            currentTime: formatNumber(timeline.currentTime),
            duration: formatNumber(timeline.duration),
          },
          editor: {
            selectedClipId: ui.selectedClipId,
            playState: ui.playState,
          },
          mediaItems: mediaItems.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            url: item.url,
            thumbnail: item.thumbnail,
            duration: formatNumber(item.duration),
            width: formatNumber(item.width),
            height: formatNumber(item.height),
          })),
          clips: clips.map(clip => ({
            id: clip.id,
            mediaId: clip.mediaId,
            start: formatNumber(clip.start),
            end: formatNumber(clip.end),
            trimStart: formatNumber(clip.trimStart),
            trimEnd: formatNumber(clip.trimEnd),
            trackIndex: clip.trackIndex,
            x: formatNumber(clip.x),
            y: formatNumber(clip.y),
            width: formatNumber(clip.width),
            height: formatNumber(clip.height),
            rotation: formatNumber(clip.rotation),
            scale: formatNumber(clip.scale),
            opacity: formatNumber(clip.opacity),
            volume: formatNumber(clip.volume),
            speed: formatNumber(clip.speed),
            text: clip.text,
            textStyle: clip.textStyle ? {
              ...clip.textStyle,
              fontSize: formatNumber(clip.textStyle.fontSize),
              strokeWidth: formatNumber(clip.textStyle.strokeWidth),
              shadowOffsetX: formatNumber(clip.textStyle.shadowOffsetX),
              shadowOffsetY: formatNumber(clip.textStyle.shadowOffsetY),
              shadowBlur: formatNumber(clip.textStyle.shadowBlur),
            } : undefined,
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
            cropArea: clip.cropArea ? {
              ...clip.cropArea,
              x: formatNumber(clip.cropArea.x),
              y: formatNumber(clip.cropArea.y),
              width: formatNumber(clip.cropArea.width),
              height: formatNumber(clip.cropArea.height),
            } : undefined,
          })),
        };
      }
      
      // 监听消息
      self.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        
        try {
          switch (type) {
            case 'GENERATE_SNAPSHOT':
              const snapshot = generateDataSnapshot(payload);
              self.postMessage({
                type: 'SNAPSHOT_READY',
                payload: snapshot,
              });
              break;
              
            case 'PREPARE_SAVE':
              const projectData = prepareProjectData(payload);
              self.postMessage({
                type: 'SAVE_READY',
                payload: projectData,
              });
              break;
              
            default:
              console.warn('Unknown message type:', type);
          }
        } catch (error) {
          self.postMessage({
            type: 'ERROR',
            payload: {
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      });
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    console.log("✅ 自动保存 Web Worker 已创建（内联模式）");
    return worker;
  } catch (error) {
    console.error("❌ 无法创建 Web Worker:", error);
    return null;
  }
}

/**
 * 生成数据快照（主线程备用方法）
 * 
 * 当Web Worker不可用时，在主线程中生成数据快照用于对比
 * 
 * 快照内容：
 * - 媒体素材的基本信息（id, name, type, url）
 * - 片段的核心属性（位置、尺寸、文本等）
 * - 画布比例和项目名称
 * 
 * 注意：
 * - 只序列化必要字段，减少对比开销
 * - 不包含File对象等不可序列化的数据
 * - 返回JSON字符串，可直接用于对比
 * 
 * @param mediaItems - 媒体素材列表
 * @param clips - 时间轴片段列表
 * @param canvasRatio - 画布比例
 * @param projectName - 项目名称
 * @returns JSON格式的数据快照字符串
 * 
 * @example
 * ```ts
 * const snapshot = generateDataSnapshot(mediaItems, clips, '16:9', '我的项目');
 * const hasChanged = snapshot !== lastSnapshot;
 * ```
 */
export function generateDataSnapshot(
  mediaItems: MediaItem[],
  clips: TimelineClip[],
  canvasRatio: string,
  projectName: string
): string {
  return JSON.stringify({
    mediaItems: mediaItems.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      url: item.url,
    })),
    clips: clips.map((clip) => ({
      id: clip.id,
      mediaId: clip.mediaId,
      start: clip.start,
      end: clip.end,
      trackIndex: clip.trackIndex,
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
      text: clip.text,
    })),
    canvasRatio,
    projectName,
  });
}

/**
 * 准备项目保存数据（主线程备用方法）
 * 
 * 当Web Worker不可用时，在主线程中准备完整的项目数据用于保存
 * 
 * 生成的ProjectData包含：
 * - 版本信息
 * - 项目元数据（名称、创建时间、更新时间）
 * - 画布配置（尺寸、比例、背景色）
 * - 时间轴配置（缩放、时间、时长）
 * - 编辑器状态（选中片段、播放状态）
 * - 序列化的媒体素材
 * - 序列化的时间轴片段
 * 
 * @param projectName - 项目名称
 * @param mediaItems - 媒体素材列表
 * @param clips - 时间轴片段列表
 * @param canvas - 画布配置
 * @param timeline - 时间轴配置
 * @param ui - 编辑器UI状态
 * @returns 完整的项目数据对象（ProjectData）
 * 
 * @example
 * ```ts
 * const projectData = prepareProjectSaveData(
 *   '我的项目',
 *   mediaItems,
 *   clips,
 *   { width: 1920, height: 1080, backgroundColor: '#000000', ratio: '16:9' },
 *   { scale: 5, currentTime: 10.5, duration: 120 },
 *   { selectedClipId: 'clip-1', playState: 'paused' }
 * );
 * 
 * // 保存到文件
 * await saveProjectData(projectData);
 * ```
 */
export function prepareProjectSaveData(
  projectName: string,
  mediaItems: MediaItem[],
  clips: TimelineClip[],
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    ratio: string;
  },
  timeline: {
    scale: number;
    currentTime: number;
    duration: number;
  },
  ui: {
    selectedClipId: string | null;
    playState: string;
  }
): ProjectData {
  return {
    version: "1.0",
    projectName: projectName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canvas: {
      width: canvas.width,
      height: canvas.height,
      backgroundColor: canvas.backgroundColor,
      ratio: canvas.ratio,
    },
    timeline: {
      scale: timeline.scale,
      currentTime: timeline.currentTime,
      duration: timeline.duration,
    },
    editor: {
      selectedClipId: ui.selectedClipId,
      playState: ui.playState as 'playing' | 'paused',
    },
    mediaItems: mediaItems.map((item) => ({
      id: item.id,
      name: item.name || "",
      type: item.type,
      url: item.url || "",
      thumbnail: item.thumbnail,
      duration: item.duration,
      width: item.width,
      height: item.height,
      text: item.text,
    })),
    clips: clips.map((clip) => ({
      id: clip.id,
      mediaId: clip.mediaId,
      start: clip.start,
      end: clip.end,
      trimStart: clip.trimStart,
      trimEnd: clip.trimEnd,
      trackIndex: clip.trackIndex,
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
      rotation: clip.rotation,
      scale: clip.scale,
      opacity: clip.opacity,
      text: clip.text,
      textStyle: clip.textStyle,
      mediaStyle: clip.mediaStyle,
      cropArea: clip.cropArea,
    })),
  };
}

// Worker 消息类型定义
export interface WorkerMessage {
  type: "GENERATE_SNAPSHOT" | "PREPARE_SAVE";
  payload: any;
}

export interface WorkerResponse {
  type: "SNAPSHOT_READY" | "SAVE_READY" | "ERROR";
  payload: any;
}

