import { message } from "antd";
import { useTranslation } from "react-i18next";
import { MediaItem, TimelineClip } from "../types";

/**
 * 片段操作Hook的参数接口
 */
interface UseClipOperationsProps {
  /** 所有时间轴片段 */
  clips: TimelineClip[];
  /** 媒体素材库 */
  mediaItems: MediaItem[];
  /** 当前选中的片段ID */
  selectedClipId: string | null;
  /** 当前播放时间 */
  currentTime: number;
  /** 设置片段列表 */
  setClips: (clips: TimelineClip[]) => void;
  /** 设置媒体素材列表 */
  setMediaItems: (items: MediaItem[]) => void;
  /** 设置选中片段ID */
  setSelectedClipId: (id: string | null) => void;
  /** 设置当前时间 */
  setCurrentTime: (time: number) => void;
  /** 设置播放状态 */
  setIsPlaying: (isPlaying: boolean) => void;
  /** 保存到历史记录 */
  saveToHistory: (description: string, newClips?: TimelineClip[], newMediaItems?: MediaItem[], newSelectedClipId?: string | null) => void;
}

/**
 * 片段操作自定义Hook
 *
 * 集中管理所有与片段和媒体素材相关的操作，包括：
 *
 * 素材管理：
 * - 添加/删除媒体素材
 * - 从媒体库添加片段到时间轴
 *
 * 片段操作：
 * - 更新片段属性（位置、轨道、裁剪等）
 * - 批量更新片段
 * - 删除片段
 * - 选择片段
 *
 * 高级功能：
 * - 片段分割（在当前时间位置）
 * - 片段复制
 * - 片段调整大小（裁剪）
 * - 轨道重映射
 *
 * 所有操作都会自动保存到历史记录，支持撤销/重做
 *
 * @param props - 片段操作所需的参数
 * @returns 包含所有片段操作回调函数的对象
 *
 * @example
 * ```tsx
 * const {
 *   handleMediaAdd,
 *   handleClipUpdate,
 *   handleClipSplit,
 *   handleClipDuplicate
 * } = useClipOperations({
 *   clips,
 *   mediaItems,
 *   selectedClipId,
 *   currentTime,
 *   setClips,
 *   setMediaItems,
 *   setSelectedClipId,
 *   setCurrentTime,
 *   setIsPlaying,
 *   saveToHistory
 * });
 * ```
 */
export const useClipOperations = ({ clips, mediaItems, selectedClipId, currentTime, setClips, setMediaItems, setSelectedClipId, setCurrentTime, setIsPlaying, saveToHistory }: UseClipOperationsProps) => {
  const { t } = useTranslation();

  // 素材管理
  const handleMediaAdd = (item: MediaItem) => {
    // 调整素材列表，新添加的素材放在最前面
    const newMediaItems = [item, ...mediaItems];
    setMediaItems(newMediaItems);
  };

  const handleMediaRemove = (id: string) => {
    const mediaToRemove = mediaItems.find((item) => item.id === id);
    const newMediaItems = mediaItems.filter((item) => item.id !== id);
    const newClips = clips.filter((clip) => clip.mediaId !== id);
    saveToHistory(`删除素材: ${mediaToRemove?.name || id}`, newClips, newMediaItems, selectedClipId);
    setMediaItems(newMediaItems);
    setClips(newClips);
    message.info(t("message.mediaDeleted"));
  };

  // 片段管理 - 添加到轨道
  const handleClipAdd = (clip: TimelineClip) => {
    // 停止播放
    setIsPlaying(false);

    let newClips: TimelineClip[];
    if (clip.trackIndex === 0) {
      const updatedClips = clips.map((c) => ({
        ...c,
        trackIndex: c.trackIndex + 1,
      }));
      newClips = [clip, ...updatedClips];
    } else {
      newClips = [...clips, clip];
    }

    setClips(newClips);

    // 延迟选中新元素，确保 DOM 已更新
    setTimeout(() => {
      setSelectedClipId(clip.id);
    }, 0);

    saveToHistory(`添加片段到轨道`, newClips, mediaItems, clip.id);
    message.success(t("message.addedToTimeline"));
  };

  // 同时添加素材和片段
  const handleMediaAndClipAdd = (media: MediaItem, clip: TimelineClip) => {
    // 停止播放
    setIsPlaying(false);

    const newMediaItems = [...mediaItems, media];

    let newClips: TimelineClip[];
    if (clip.trackIndex === 0) {
      const updatedClips = clips.map((c) => ({
        ...c,
        trackIndex: c.trackIndex + 1,
      }));
      newClips = [clip, ...updatedClips];
    } else {
      newClips = [...clips, clip];
    }

    setMediaItems(newMediaItems);
    setClips(newClips);

    // 延迟选中新元素，确保 DOM 已更新
    setTimeout(() => {
      setSelectedClipId(clip.id);
    }, 0);

    saveToHistory(`添加到时间轴`, newClips, newMediaItems, clip.id);
    message.success(t("message.addedToTimeline"));
  };

  const handleClipUpdate = (id: string, updates: Partial<TimelineClip>, options?: { skipHistory?: boolean; historyDescription?: string }) => {
    const newClips = clips.map((clip) => (clip.id === id ? { ...clip, ...updates } : clip));

    const skipHistory = options?.skipHistory ?? false;
    const historyDescription = options?.historyDescription ?? "更新片段属性";

    if (!skipHistory) {
      saveToHistory(historyDescription, newClips, mediaItems, selectedClipId);
    }

    setClips(newClips);
  };

  const handleClipRemove = (id: string) => {
    const newClips = clips.filter((clip) => clip.id !== id);
    const newSelectedClipId = selectedClipId === id ? null : selectedClipId;
    saveToHistory(`删除片段`, newClips, mediaItems, newSelectedClipId);
    setClips(newClips);
    if (selectedClipId === id) {
      setSelectedClipId(null);
    }
  };

  // 编辑工具功能
  const handleCopyClip = () => {
    if (!selectedClipId) return;

    const clipToCopy = clips.find((c) => c.id === selectedClipId);
    if (!clipToCopy) return;

    // 创建复制的片段，放置在轨道最上方（trackIndex = 0）
    const newClip: TimelineClip = {
      ...clipToCopy,
      id: `clip-${Date.now()}-${Math.random()}`,
      trackIndex: 0,
    };

    // 将所有现有片段的轨道索引 + 1，为新片段腾出空间
    const updatedClips = clips.map((c) => ({
      ...c,
      trackIndex: c.trackIndex + 1,
    }));

    // 将新片段添加到列表开头
    const newClips = [newClip, ...updatedClips];
    saveToHistory(`复制片段`, newClips, mediaItems, newClip.id);

    setClips(newClips);
    setSelectedClipId(newClip.id);
    message.success(t("message.clipCopied"));
  };

  const handleSplitClip = () => {
    if (!selectedClipId) return;

    const clipToSplit = clips.find((c) => c.id === selectedClipId);
    if (!clipToSplit) return;

    if (currentTime <= clipToSplit.start || currentTime >= clipToSplit.end) {
      message.warning(t("message.movePlayheadToSplit"));
      return;
    }

    const media = mediaItems.find((m) => m.id === clipToSplit.mediaId);
    const mediaDuration = media?.duration || 0;

    const oldTrimStart = clipToSplit.trimStart || 0;
    const oldTrimEnd = clipToSplit.trimEnd || mediaDuration;

    const timelineOffset = currentTime - clipToSplit.start;
    const splitVideoTime = oldTrimStart + timelineOffset;

    const clip1: TimelineClip = {
      ...clipToSplit,
      id: `clip-${Date.now()}-${Math.random()}-1`,
      end: currentTime,
      trimStart: oldTrimStart,
      trimEnd: splitVideoTime,
    };

    const clip2: TimelineClip = {
      ...clipToSplit,
      id: `clip-${Date.now()}-${Math.random()}-2`,
      start: currentTime,
      trimStart: splitVideoTime,
      trimEnd: oldTrimEnd,
    };

    const newClips = clips.filter((c) => c.id !== selectedClipId).concat([clip1, clip2]);
    saveToHistory(`分割片段`, newClips, mediaItems, clip2.id);
    setClips(newClips);
    setSelectedClipId(clip2.id);
    message.success(t("message.clipSplit"));
  };

  // 向左分割：删除左侧部分，保留右侧
  const handleSplitLeft = () => {
    if (!selectedClipId) return;

    const clipToSplit = clips.find((c) => c.id === selectedClipId);
    if (!clipToSplit) return;

    if (currentTime <= clipToSplit.start || currentTime >= clipToSplit.end) {
      message.warning(t("message.movePlayheadToSplit"));
      return;
    }

    const oldTrimStart = clipToSplit.trimStart || 0;
    const timelineOffset = currentTime - clipToSplit.start;
    const splitVideoTime = oldTrimStart + timelineOffset;

    // 只保留右侧部分
    const newClip: TimelineClip = {
      ...clipToSplit,
      start: currentTime,
      trimStart: splitVideoTime,
    };

    const newClips = clips.map((c) => (c.id === selectedClipId ? newClip : c));

    saveToHistory(`向左分割`, newClips, mediaItems, selectedClipId);
    setClips(newClips);
    message.success("已删除左侧部分");
  };

  // 向右分割：删除右侧部分，保留左侧
  const handleSplitRight = () => {
    if (!selectedClipId) return;

    const clipToSplit = clips.find((c) => c.id === selectedClipId);
    if (!clipToSplit) return;

    if (currentTime <= clipToSplit.start || currentTime >= clipToSplit.end) {
      message.warning(t("message.movePlayheadToSplit"));
      return;
    }

    const oldTrimStart = clipToSplit.trimStart || 0;
    const timelineOffset = currentTime - clipToSplit.start;
    const splitVideoTime = oldTrimStart + timelineOffset;

    // 只保留左侧部分
    const newClip: TimelineClip = {
      ...clipToSplit,
      end: currentTime,
      trimEnd: splitVideoTime,
    };

    const newClips = clips.map((c) => (c.id === selectedClipId ? newClip : c));

    saveToHistory(`向右分割`, newClips, mediaItems, selectedClipId);
    setClips(newClips);
    message.success("已删除右侧部分");
  };

  const handleDeleteClip = () => {
    if (!selectedClipId) return;
    handleClipRemove(selectedClipId);
    message.success(t("message.clipDeleted"));
  };

  const handleClipResize = (clipId: string, newStart: number, newEnd: number, edge: "left" | "right") => {
    console.log(
      "handleClipResize",
      {
        clipId,
        newStart: newStart.toFixed(2),
        newEnd: newEnd.toFixed(2),
        edge,
      },
      mediaItems,
      clips
    );

    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    let updates: Partial<TimelineClip> = {
      start: newStart,
      end: newEnd,
    };

    const media = mediaItems.find((m) => m.id === clip.mediaId);

    if (media) {
      // 只对视频和音频进行裁剪处理
      if (media.type === "video" || media.type === "audio") {
        const oldTrimStart = clip.trimStart || 0;
        // 如果没有设置trimEnd或media.duration，使用当前片段长度作为默认值
        const currentClipDuration = clip.end - clip.start;
        const oldTrimEnd = clip.trimEnd || (media.duration ? media.duration : oldTrimStart + currentClipDuration);
        const originalDuration = media.duration || Math.max(oldTrimEnd, oldTrimStart + currentClipDuration);

        if (edge === "left") {
          // 拖动左边缘：调整 trimStart
          const startDelta = newStart - clip.start;
          let newTrimStart = oldTrimStart + startDelta;

          // 限制在合理范围内，且不能超过 trimEnd
          newTrimStart = Math.max(0, Math.min(newTrimStart, oldTrimEnd - 0.1));

          updates.trimStart = newTrimStart;

          console.log(`✂️ 左边缘裁剪: trimStart=${oldTrimStart.toFixed(2)}s → ${newTrimStart.toFixed(2)}s`);
        } else {
          // 拖动右边缘：调整 trimEnd
          const endDelta = newEnd - clip.end;
          let newTrimEnd = oldTrimEnd + endDelta;

          // 如果有原始时长限制则使用，否则允许自由调整但不能小于trimStart
          if (media.duration) {
            newTrimEnd = Math.max(oldTrimStart + 0.1, Math.min(newTrimEnd, originalDuration));
          } else {
            // 没有原始时长限制时，只确保不小于trimStart
            newTrimEnd = Math.max(oldTrimStart + 0.1, newTrimEnd);
          }

          updates.trimEnd = newTrimEnd;

          console.log(`✂️ 右边缘裁剪: trimEnd=${oldTrimEnd.toFixed(2)}s → ${newTrimEnd.toFixed(2)}s`);
        }
      }
    }

    const newClips = clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c));
    setClips(newClips);
  };

  const handleClipResizeEnd = () => {
    saveToHistory(`调整片段大小`, clips, mediaItems, selectedClipId);
  };

  return {
    handleMediaAdd,
    handleMediaRemove,
    handleClipAdd,
    handleMediaAndClipAdd,
    handleClipUpdate,
    handleClipRemove,
    handleCopyClip,
    handleSplitClip,
    handleSplitLeft,
    handleSplitRight,
    handleDeleteClip,
    handleClipResize,
    handleClipResizeEnd,
  };
};
