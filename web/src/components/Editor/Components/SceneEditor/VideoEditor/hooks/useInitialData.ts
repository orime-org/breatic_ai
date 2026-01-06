import { useEffect } from "react";
import { MediaItem, TimelineClip } from "../types";
import { loadProjectData, ProjectData } from "../utils/projectData";
import { historyManager } from "../utils/HistoryManager";
import {
  getAudioDuration,
} from "../utils/mediaProcessor";

/**
 * 初始数据加载Hook的参数接口
 */
interface UseInitialDataProps {
  /** 初始项目数据（用于加载已保存的项目） */
  initialData?: ProjectData;
  /** 设置媒体素材列表 */
  setMediaItems: (items: MediaItem[]) => void;
  /** 设置时间轴片段列表 */
  setClips: (clips: TimelineClip[]) => void;
  /** 设置画布比例 */
  setCanvasRatio: (ratio: string) => void;
  /** 设置时间轴缩放等级 */
  setScale: (scale: number) => void;
  /** 设置当前播放时间 */
  setCurrentTime: (time: number) => void;
  /** 设置选中片段ID */
  setSelectedClipId: (id: string | null) => void;
  /** 设置项目名称 */
  setProjectName: (name: string) => void;
  /** 更新历史记录按钮状态 */
  updateHistoryButtons: () => void;
  /** 强制更新文本片段的引用 */
  forceUpdateTextRef: { current: (() => void) | null };
}

/**
 * 初始数据加载自定义Hook
 * 
 * 负责在编辑器初始化时加载项目数据，包括：
 * - 加载媒体素材和时间轴片段
 * - 恢复画布设置（比例）
 * - 恢复时间轴设置（缩放、播放位置）
 * - 恢复编辑器状态（选中片段）
 * - 异步处理媒体数据（获取音频时长等）
 * - 初始化历史记录
 * - 强制更新文本片段渲染
 * 
 * 数据加载流程：
 * 1. 解析初始数据
 * 2. 同步设置所有基本状态
 * 3. 初始化历史记录（设为"初始状态"）
 * 4. 异步处理媒体素材（获取音频时长）
 * 5. 延迟100ms后强制更新文本片段
 * 
 * 注意：
 * - 视频封面使用静态的thumbnail字段，不再动态生成
 * - 音频会异步获取时长信息
 * - 媒体处理完成后会更新历史记录
 * 
 * @param props - 初始数据加载所需的参数
 * 
 * @example
 * ```tsx
 * useInitialData({
 *   initialData: savedProject,
 *   setMediaItems,
 *   setClips,
 *   setCanvasRatio,
 *   setScale,
 *   setCurrentTime,
 *   setSelectedClipId,
 *   setProjectName,
 *   updateHistoryButtons,
 *   forceUpdateTextRef
 * });
 * ```
 */
export const useInitialData = ({
  initialData,
  setMediaItems,
  setClips,
  setCanvasRatio,
  setScale,
  setCurrentTime,
  setSelectedClipId,
  setProjectName,
  updateHistoryButtons,
  forceUpdateTextRef,
}: UseInitialDataProps) => {
  useEffect(() => {
    if (initialData) {
      const {
        mediaItems: loadedMediaItems,
        clips: loadedClips,
        canvas,
        timeline,
        editor,
      } = loadProjectData(initialData);

      // 为缺失封面/波形的媒体生成
      const processMediaItems = async () => {
        const processedItems = [...loadedMediaItems];
        let hasChanges = false;

        // 逐个处理媒体项
        for (let i = 0; i < processedItems.length; i++) {
          const item = processedItems[i];
          
          // 视频不再动态生成封面，直接使用 thumbnail 字段
          // 如果 thumbnail 为空则显示为空
          
          // 如果是音频且没有时长，获取时长（波形图使用静态图片）
          if (item.type === "audio" && !item.duration && item.url) {
            const duration = await getAudioDuration(item.url);
            processedItems[i] = { ...item, duration };
            hasChanges = true;
            
            // 立即更新以显示进度
            setMediaItems([...processedItems]);
          }
        }

        // 如果有更改，最终更新历史记录并强制刷新clips
        if (hasChanges) {
          // 强制刷新clips，触发时间轨道重新渲染
          setClips([...loadedClips]);
          
          historyManager.clear();
          historyManager.push(
            loadedClips,
            processedItems,
            editor.selectedClipId,
            "初始状态"
          );
          updateHistoryButtons();
        }
      };

      // 先设置初始数据
      setMediaItems(loadedMediaItems);
      setClips(loadedClips);
      setCanvasRatio(canvas.ratio);
      setScale(timeline.scale);
      setCurrentTime(timeline.currentTime);
      setSelectedClipId(editor.selectedClipId);
      setProjectName(initialData.projectName);

      historyManager.clear();
      historyManager.push(
        loadedClips,
        loadedMediaItems,
        editor.selectedClipId,
        "初始状态"
      );
      updateHistoryButtons();

      // 异步处理媒体项（生成封面/波形）
      processMediaItems();

      setTimeout(() => {
        forceUpdateTextRef.current?.();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);
};

