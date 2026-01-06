import { useState, useRef, useEffect } from "react";
import { MediaItem, TimelineClip } from "../types";
import useStore from "../../../../Store/store";

/**
 * 项目状态管理自定义Hook
 *
 * 集中管理视频编辑器的所有状态，包括：
 *
 * 核心数据状态：
 * - 媒体素材列表（mediaItems）
 * - 时间轴片段列表（clips）
 * - 项目名称（projectName）
 *
 * 播放器状态：
 * - 当前播放时间（currentTime）
 * - 播放状态（isPlaying）
 * - 时间轴缩放等级（scale: 1-10）
 *
 * UI状态：
 * - 选中片段ID（selectedClipId）
 * - 活动侧边栏面板（activePanel）
 * - 画布比例（canvasRatio: "16:9", "9:16", "1:1"）
 *
 * Refs：
 * - 文本片段强制更新引用（forceUpdateTextRef）
 * - 撤销/重做进行中标志（isUndoRedoInProgress）
 *
 * @returns 包含所有状态和setter函数的对象
 *
 * @example
 * ```tsx
 * const {
 *   clips,
 *   setClips,
 *   mediaItems,
 *   currentTime,
 *   isPlaying,
 *   selectedClipId,
 *   canvasRatio
 * } = useProjectState();
 * ```
 */
export const useProjectState = (nodeId: string) => {
  // 核心数据状态
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [projectName, setProjectName] = useState<string>("My Video Project");

  // 播放器状态
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scale, setScale] = useState(8); // 默认档位8（2秒/刻度）

  // UI 状态
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>("folder");
  const [canvasRatio, setCanvasRatio] = useState<string>("16:9");

  // Refs
  const forceUpdateTextRef = useRef<(() => void) | null>(null);
  const isUndoRedoInProgress = useRef(false);

  // 根据画布比例计算尺寸
  const canvasSizeMap: Record<string, { width: number; height: number }> = {
    "16:9": { width: 1920, height: 1080 },
    "9:16": { width: 1080, height: 1920 },
    "1:1": { width: 1080, height: 1080 },
  };

  const setEditorSnapshotRuntimeData = useStore((s) => s.setEditorSnapshotRuntimeData);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setEditorSnapshotRuntimeData(nodeId, "projectName", projectName);
    });

    return () => cancelAnimationFrame(raf);
  }, [projectName]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setEditorSnapshotRuntimeData(nodeId, "mediaItems", mediaItems);
    });

    return () => cancelAnimationFrame(raf);
  }, [mediaItems]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setEditorSnapshotRuntimeData(nodeId, "clips", clips);
    });

    return () => cancelAnimationFrame(raf);
  }, [clips]);

  useEffect(() => {
    const canvasSize = canvasSizeMap[canvasRatio] || canvasSizeMap["16:9"];
    const raf = requestAnimationFrame(() => {
      setEditorSnapshotRuntimeData(nodeId, "canvas", {
        width: canvasSize.width,
        height: canvasSize.height,
        backgroundColor: "#000000",
        ratio: canvasRatio,
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [canvasRatio]);

  useEffect(() => {
    // 计算项目总时长
    const maxClipEnd = clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
    const projectDuration = Math.max(maxClipEnd, currentTime);

    // if (projectDuration === 0) return;
    const raf = requestAnimationFrame(() => {
      setEditorSnapshotRuntimeData(nodeId, "timeline", {
        scale,
        currentTime,
        duration: projectDuration,
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [scale, currentTime]);

  useEffect(() => {
    // if (!selectedClipId || selectedClipId.length === 0) return;
    const raf = requestAnimationFrame(() => {
      setEditorSnapshotRuntimeData(nodeId, "editor", {
        selectedClipId,
        playState: "paused",
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [selectedClipId]);

  return {
    // 数据状态
    mediaItems,
    setMediaItems,
    clips,
    setClips,
    projectName,
    setProjectName,

    // 播放器状态
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    scale,
    setScale,

    // UI 状态
    selectedClipId,
    setSelectedClipId,
    activePanel,
    setActivePanel,
    canvasRatio,
    setCanvasRatio,

    // Refs
    forceUpdateTextRef,
    isUndoRedoInProgress,
  };
};
