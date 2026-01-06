import React, { useMemo, useState, useRef, useEffect } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { MediaItem, TimelineClip } from "../types";
import { TimelineScale } from "./TimelineScale";
import { DroppableTrackRow } from "./DroppableTrackRow";
import { PlaybackCursor } from "./PlaybackCursor";
import { ThinScrollbar } from "../utils/Scrollbar";
import { useTimelineScale } from "../hooks/useTimelineScale";
import { useTrackData } from "../hooks/useTrackData";
import { useTimelineSnap } from "../hooks/useTimelineSnap";
import { checkCollision, snapToPosition } from "../utils/timelineUtils";

interface TimelineEditorProps {
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  currentTime: number;
  duration: number;
  scale: number;
  selectedClipId: string | null;
  reactflowScale?: number; // ReactFlow 节点的缩放系数（默认 1.0）
  onClipUpdate: (id: string, updates: Partial<TimelineClip>, options?: { skipHistory?: boolean; historyDescription?: string }) => void;
  onBatchClipsUpdate?: (updatedClips: TimelineClip[], skipHistory?: boolean, description?: string) => void;
  onClipRemove: (id: string) => void;
  onClipResize: (clipId: string, newStart: number, newEnd: number, edge: "left" | "right") => void;
  onClipResizeEnd?: () => void;
  onTimeChange: (time: number) => void;
  onScaleChange: (scale: number) => void;
  onClipSelect: (id: string | null) => void;
  onCursorDragStart?: (time: number) => void;
  onCursorDragEnd?: (time: number) => void;
  onTracksRemapped?: (trackIndexMap: { [oldIndex: number]: number }) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const TimelineEditorComponent: React.FC<TimelineEditorProps> = ({
  clips,
  mediaItems,
  currentTime,
  duration,
  scale,
  selectedClipId,
  reactflowScale = 1.0, // 默认缩放系数为 1（无缩放）
  onClipUpdate,
  onBatchClipsUpdate,
  onClipRemove,
  onClipResize,
  onClipResizeEnd,
  onTimeChange,
  onScaleChange,
  onClipSelect,
  onCursorDragStart,
  onCursorDragEnd,
  onTracksRemapped,
  onDragStart,
  onDragEnd,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<any>(null); // Scrollbars 组件引用
  const scaleRef = useRef<HTMLDivElement>(null); // 刻度容器引用
  const [snapLines, setSnapLines] = useState<number[]>([]); // 辅助吸附线
  const [isDragging, setIsDragging] = useState(false);
  const [scaleScrollLeft, setScaleScrollLeft] = useState(0); // 刻度滚动偏移
  const [draggingMaxEnd, setDraggingMaxEnd] = useState<number>(0); // 拖动过程中的最大结束位置
  const [hoverTrackIndex, setHoverTrackIndex] = useState<number | null>(null); // 悬停的轨道索引
  const [isHoverAboveFirstTrack, setIsHoverAboveFirstTrack] = useState<boolean>(false); // 是否悬停在顶部空白区域
  const [preserveEmptyTracks, setPreserveEmptyTracks] = useState<boolean>(false); // 是否保留空轨道
  const dragSourceTrackRef = useRef<number | null>(null); // 拖拽源轨道索引

  // 使用自定义hooks
  const scaleParams = useTimelineScale(scale);
  const pixelsPerSecond = scaleParams.pixelsPerSecond;
  const timeScaleValue = scaleParams.timeScaleValue;
  const fixedScaleWidth = scaleParams.fixedScaleWidth;

  const trackData = useTrackData(clips, preserveEmptyTracks, onTracksRemapped);
  const { snapModifier, resetSnap } = useTimelineSnap(isDragging, clips, currentTime, pixelsPerSecond);

  // 调试：监控 TimelineEditor 渲染
  useEffect(() => {
    console.log("🎞️ [TimelineEditor] clips 状态更新:", {
      clips数量: clips.length,
      clipIds: clips.map((c) => c.id),
    });
  }, [clips]);

  // 处理滚动事件，同步刻度
  const handleScroll = () => {
    if (scrollbarRef.current) {
      const scrollLeft = scrollbarRef.current.getScrollLeft();
      setScaleScrollLeft(scrollLeft);
    }
  };

  // 获取实时滚动位置
  const getScrollLeft = () => {
    return scrollbarRef.current?.getScrollLeft() || 0;
  };

  // 处理边缘调整大小（裁剪素材）
  const handleClipResize = (clipId: string, newStart: number, newEnd: number, edge: "left" | "right") => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const media = mediaItems.find((m) => m.id === clip.mediaId);

    const snappedStart = snapToPosition(newStart, currentTime, clips, clipId).time;
    const snappedEnd = snapToPosition(newEnd, currentTime, clips, clipId).time;

    let finalStart = snappedStart;
    let finalEnd = snappedEnd;

    if (media) {
      const oldTrimStart = clip.trimStart || 0;
      // 如果没有设置trimEnd或media.duration，使用当前片段长度作为默认值
      const currentClipDuration = clip.end - clip.start;
      const oldTrimEnd = clip.trimEnd || (media.duration ? media.duration : oldTrimStart + currentClipDuration);
      const originalDuration = media.duration || Math.max(oldTrimEnd, oldTrimStart + currentClipDuration);

      // 只对视频和音频进行裁剪处理
      if (media.type === "video" || media.type === "audio") {
        if (edge === "left") {
          // 拖动左边缘：调整 start 和 trimStart
          const startDelta = snappedStart - clip.start;
          let newTrimStart = oldTrimStart + startDelta;

          // 限制在原始时长内，且不能超过 trimEnd
          newTrimStart = Math.max(0, Math.min(newTrimStart, oldTrimEnd - 0.1));

          const trimmedDuration = oldTrimEnd - newTrimStart;

          finalStart = snappedStart;
          finalEnd = snappedStart + trimmedDuration;

          console.log(`✂️ 左边缘裁剪: trimStart=${oldTrimStart.toFixed(2)}s → ${newTrimStart.toFixed(2)}s, trimEnd保持=${oldTrimEnd.toFixed(2)}s`);
        } else {
          // 拖动右边缘：调整 end 和 trimEnd
          const endDelta = snappedEnd - clip.end;
          let newTrimEnd = oldTrimEnd + endDelta;

          // 如果有原始时长限制则使用，否则允许自由调整但不能小于trimStart
          if (media.duration) {
            newTrimEnd = Math.max(oldTrimStart + 0.1, Math.min(newTrimEnd, originalDuration));
          } else {
            // 没有原始时长限制时，只确保不小于trimStart
            newTrimEnd = Math.max(oldTrimStart + 0.1, newTrimEnd);
          }

          const trimmedDuration = newTrimEnd - oldTrimStart;

          finalStart = clip.start;
          finalEnd = clip.start + trimmedDuration;

          console.log(`✂️ 右边缘裁剪: trimStart保持=${oldTrimStart.toFixed(2)}s, trimEnd=${oldTrimEnd.toFixed(2)}s → ${newTrimEnd.toFixed(2)}s`);
        }
      } else {
        // 图片等静态素材，直接调整时间轴位置
        finalStart = snappedStart;
        finalEnd = snappedEnd;
      }
    }

    // 检查碰撞
    const willCollide = checkCollision(clips, clipId, clip.trackIndex, finalStart, finalEnd);

    if (willCollide) {
      // 发生碰撞，不允许调整到此大小
      console.warn("⚠️ 碰撞检测：无法调整素材大小（会与其他素材重叠）");
      return;
    }

    // 调用传入的onClipResize函数
    onClipResize(clipId, finalStart, finalEnd, edge);

    // 清除辅助线
    setSnapLines([]);
  };

  // DnD Kit 拖拽事件
  // 处理拖动开始
  const handleDragStart = (event: any) => {
    setIsDragging(true);
    setDraggingMaxEnd(0); // 重置拖动最大位置
    setHoverTrackIndex(null); // 清除悬停轨道
    setIsHoverAboveFirstTrack(false); // 清除顶部悬停标志
    setPreserveEmptyTracks(false); // 重置空轨道保留标志

    // 保存拖拽源轨道索引
    const itemId = event.active.id as string;
    const clip = clips.find((c) => c.id === itemId);
    if (clip) {
      dragSourceTrackRef.current = clip.trackIndex;
      console.log(`🎬 开始拖拽素材，源轨道: ${clip.trackIndex}`);
    }

    resetSnap();
    // 调用拖拽开始回调
    onDragStart?.();
  };

  // 处理拖动过程（显示辅助线）
  const handleDragMove = (event: any) => {
    const { active, delta, over } = event;
    const itemId = active.id as string;
    const clip = clips.find((c) => c.id === itemId);
    if (!clip) return;

    const deltaTime = delta.x / pixelsPerSecond;
    const newStart = Math.max(0, clip.start + deltaTime);
    const clipDuration = clip.end - clip.start;
    const newEnd = newStart + clipDuration;

    // 更新拖动过程中的最大结束位置
    setDraggingMaxEnd((prev) => Math.max(prev, newEnd));

    // 检测开始位置的吸附
    const snapResultStart = snapToPosition(newStart, currentTime, clips, itemId);
    // 检测结束位置的吸附
    const snapResultEnd = snapToPosition(newEnd, currentTime, clips, itemId);

    // 合并所有辅助线（去重）
    const allSnapLines = Array.from(new Set([...snapResultStart.snapLines, ...snapResultEnd.snapLines]));
    setSnapLines(allSnapLines);

    // 检测悬停的轨道并判断是否有时间重叠（顶部空白区域由TopDropZone组件处理）
    if (over && over.id) {
      const overTrackId = over.id as string;
      if (overTrackId.startsWith("track-")) {
        const overTrackIndex = parseInt(overTrackId.replace("track-", ""));

        // 检测同一轨道或不同轨道的重叠
        // 检查拖动素材与目标轨道上的素材是否有时间重叠
        const targetTrackClips = clips.filter((c) => c.trackIndex === overTrackIndex && c.id !== itemId);

        let hasOverlap = false;
        for (const targetClip of targetTrackClips) {
          // 检测时间重叠：newStart < targetClip.end && newEnd > targetClip.start
          if (newStart < targetClip.end && newEnd > targetClip.start) {
            hasOverlap = true;
            break;
          }
        }

        if (hasOverlap) {
          // 如果是同一轨道
          if (overTrackIndex === dragSourceTrackRef.current) {
            // 同一轨道内的重叠：检查该轨道是否还有其他素材
            const trackHasOthers = clips.some((c) => c.id !== itemId && c.trackIndex === overTrackIndex);

            if (trackHasOthers) {
              console.log(`🎯 同一轨道内重叠，显示插入线（轨道${overTrackIndex}）`);
              setHoverTrackIndex(overTrackIndex);
              setIsHoverAboveFirstTrack(false);
            } else {
              setHoverTrackIndex(null);
              setIsHoverAboveFirstTrack(false);
            }
          } else {
            // 不同轨道的重叠
            console.log(`🎯 悬停在轨道 ${overTrackIndex}，有时间重叠，显示插入线`);
            setHoverTrackIndex(overTrackIndex);
            setIsHoverAboveFirstTrack(false);
          }
        } else {
          // 没有重叠，检查是否是0号轨道且向上超出20px
          if (overTrackIndex === 0) {
            // 计算相对于0号轨道的垂直偏移
            const trackHeight = 42; // 32px轨道高度 + 10px margin
            const sourceTrackIndex = dragSourceTrackRef.current || 0;

            // 从其他轨道移到0号轨道是向上移动，delta.y是负数
            // adjustedDeltaY = delta.y + 源轨道到0号轨道的距离
            // 例如：从轨道1移到轨道0，理论偏移 = -42，如果只移到轨道0，delta.y ≈ -42，adjustedDeltaY = -42 + 42 = 0
            const adjustedDeltaY = delta.y + sourceTrackIndex * trackHeight;

            // 垂直偏移阈值：向上超出20px才触发
            const verticalThreshold = -20;

            if (adjustedDeltaY < verticalThreshold) {
              console.log(`🎯 素材拖动到0号轨道无重叠且向上超出${Math.abs(adjustedDeltaY)}px（源轨道${sourceTrackIndex}，原始偏移${delta.y}px），显示顶部横线`);
              setIsHoverAboveFirstTrack(true);
              setHoverTrackIndex(null);
            } else {
              console.log(`🎯 素材拖动到0号轨道无重叠但未超出阈值（调整后偏移=${adjustedDeltaY.toFixed(1)}px），普通移动`);
              setHoverTrackIndex(null);
              setIsHoverAboveFirstTrack(false);
            }
          } else {
            console.log(`🎯 悬停在轨道 ${overTrackIndex}，无时间重叠，普通移动`);
            setHoverTrackIndex(null);
            setIsHoverAboveFirstTrack(false);
          }
        }
      }
    } else {
      setHoverTrackIndex(null);
      setIsHoverAboveFirstTrack(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;

    // 保存悬停轨道索引（在清除状态前）
    const shouldInsertTrack = hoverTrackIndex !== null || isHoverAboveFirstTrack;
    const shouldInsertAtTop = isHoverAboveFirstTrack; // 是否在顶部新增轨道
    const insertAtTrackIndex = isHoverAboveFirstTrack ? 0 : hoverTrackIndex;
    const sourceTrackIndex = dragSourceTrackRef.current;

    // 清除辅助线和拖动状态
    setSnapLines([]);
    setIsDragging(false);
    setDraggingMaxEnd(0); // 重置拖动最大位置
    setHoverTrackIndex(null); // 清除悬停轨道
    setIsHoverAboveFirstTrack(false); // 清除顶部悬停标志
    dragSourceTrackRef.current = null; // 清除源轨道

    if (!over) {
      return;
    }

    const itemId = active.id as string;
    const newRowId = over.id as string;

    const clip = clips.find((c) => c.id === itemId);
    if (!clip) return;

    // 计算时间偏移（根据水平拖动距离）
    const deltaTime = delta.x / pixelsPerSecond;
    const newStart = Math.max(0, clip.start + deltaTime);
    const clipDuration = clip.end - clip.start;

    // 应用吸附
    let finalStart = newStart;
    let finalEnd = newStart + clipDuration;

    if (Math.abs(deltaTime) > 0.01) {
      const snapResult = snapToPosition(newStart, currentTime, clips, itemId);
      finalStart = snapResult.time;
      finalEnd = finalStart + clipDuration;
    }

    // 处理拖放ID
    let newTrackIndex = 0;
    if (newRowId === "track-top") {
      // 拖到顶部空白区域，目标轨道为0
      newTrackIndex = 0;
    } else {
      newTrackIndex = parseInt(newRowId.replace("track-", ""));
    }

    // 如果是轨道插入模式
    if (shouldInsertTrack && insertAtTrackIndex !== null && sourceTrackIndex !== null) {
      // 特殊处理：新增顶部轨道
      if (shouldInsertAtTop) {
        console.log(`🎬 新增顶部轨道: 从轨道${sourceTrackIndex}插入到顶部`);

        // 设置标志，保留空轨道
        setPreserveEmptyTracks(true);

        // 将拖动素材移动到轨道0
        newTrackIndex = 0;

        // 【关键】所有其他素材都下移一个轨道
        const updatedClips = clips.map((c) => {
          // 拖动素材：移到轨道0 + 更新时间
          if (c.id === itemId) {
            const updated: TimelineClip = { ...c, trackIndex: 0 };
            if (Math.abs(deltaTime) > 0.01) {
              updated.start = finalStart;
              updated.end = finalEnd;
            }
            return updated;
          }

          // 所有其他素材：下移一个轨道
          const oldTrack = c.trackIndex;
          const newTrack = c.trackIndex + 1;
          console.log(`  → 素材${c.id.slice(0, 8)} 从轨道${oldTrack}移到${newTrack}`);
          return { ...c, trackIndex: newTrack };
        });

        // 批量应用所有更新
        if (onBatchClipsUpdate) {
          console.log(`  批量更新${updatedClips.filter((c, i) => c !== clips[i]).length}个素材`);
          onBatchClipsUpdate(updatedClips, false, "新增顶部轨道");
        }

        console.log(`  ✅ 新增顶部轨道完成，拖动素材移到轨道0`);

        // 立即恢复正常模式，空轨道将被自动清理
        setPreserveEmptyTracks(false);
        console.log("🔄 恢复正常模式，空轨道将被自动清理");

        onDragEnd?.();
        return;
      }

      // 普通插入模式
      const direction = insertAtTrackIndex < sourceTrackIndex ? "上" : "下";
      console.log(`🎬 轨道插入(往${direction}): 从轨道${sourceTrackIndex}插入到轨道${insertAtTrackIndex}`);

      // 设置标志，保留空轨道
      setPreserveEmptyTracks(true);

      // 将拖动素材移动到目标轨道
      newTrackIndex = insertAtTrackIndex;

      // 【关键判断】检查源轨道是否还有其他素材
      const sourceTrackHasOtherClips = clips.some((c) => c.id !== itemId && c.trackIndex === sourceTrackIndex);

      if (sourceTrackHasOtherClips) {
        console.log(`  源轨道${sourceTrackIndex}还有其他素材，使用新增轨道模式`);
      } else {
        console.log(`  源轨道${sourceTrackIndex}没有其他素材，使用原有逻辑`);
      }

      // 【关键修复】一次性创建包含所有更新的clips数组（包括拖动素材的轨道和时间）
      const updatedClips = clips.map((c) => {
        // 拖动素材：移到目标轨道 + 更新时间
        if (c.id === itemId) {
          const updated: TimelineClip = { ...c, trackIndex: newTrackIndex };
          // 如果有时间变化，也一起更新
          if (Math.abs(deltaTime) > 0.01) {
            updated.start = finalStart;
            updated.end = finalEnd;
          }
          return updated;
        }

        // 如果源轨道还有其他素材：新增轨道模式
        if (sourceTrackHasOtherClips) {
          // 所有从插入位置开始的素材都下移
          if (c.trackIndex >= insertAtTrackIndex) {
            const oldTrack = c.trackIndex;
            const newTrack = c.trackIndex + 1;
            console.log(`  → 素材${c.id.slice(0, 8)} 从轨道${oldTrack}移到${newTrack}`);
            return { ...c, trackIndex: newTrack };
          }
        } else {
          // 源轨道没有其他素材：原有逻辑
          // 往上拖动：中间素材下移
          if (insertAtTrackIndex < sourceTrackIndex) {
            if (c.trackIndex >= insertAtTrackIndex && c.trackIndex < sourceTrackIndex) {
              const oldTrack = c.trackIndex;
              const newTrack = c.trackIndex + 1;
              console.log(`  → 素材${c.id.slice(0, 8)} 从轨道${oldTrack}移到${newTrack}`);
              return { ...c, trackIndex: newTrack };
            }
          }
          // 往下拖动：中间素材上移
          else if (insertAtTrackIndex > sourceTrackIndex) {
            if (c.trackIndex > sourceTrackIndex && c.trackIndex <= insertAtTrackIndex) {
              const oldTrack = c.trackIndex;
              const newTrack = c.trackIndex - 1;
              console.log(`  → 素材${c.id.slice(0, 8)} 从轨道${oldTrack}移到${newTrack}`);
              return { ...c, trackIndex: newTrack };
            }
          }
        }

        return c;
      });

      // 批量应用所有更新
      if (onBatchClipsUpdate) {
        console.log(`  批量更新${updatedClips.filter((c, i) => c !== clips[i]).length}个素材`);
        // 使用批量更新，一次性更新所有clips，并保存历史记录
        onBatchClipsUpdate(updatedClips, false, "插入轨道"); // 保存历史，描述为"插入轨道"
      }

      console.log(`  🎯 拖动素材从轨道${sourceTrackIndex}插入到轨道${newTrackIndex}`);
      console.log(`  ✅ 轨道插入完成，轨道${sourceTrackIndex}变为空轨道`);

      // 延迟恢复正常模式，允许空轨道被清理
      setTimeout(() => {
        setPreserveEmptyTracks(false);
        console.log("🔄 恢复正常模式，空轨道将被自动清理");
      }, 2000); // 2秒后清理空轨道

      // 调用拖拽结束回调
      onDragEnd?.();
      return; // 已经批量更新完成，直接返回
    } else {
      // 普通拖拽模式：检查碰撞
      const willCollide = checkCollision(clips, itemId, newTrackIndex, finalStart, finalEnd);

      if (willCollide) {
        console.warn("⚠️ 碰撞检测：无法将素材移动到此位置（与其他素材重叠）");
        return;
      }
    }

    // 更新拖动素材的轨道和时间
    const updates: Partial<TimelineClip> = {};

    if (clip.trackIndex !== newTrackIndex) {
      updates.trackIndex = newTrackIndex;
    }

    if (Math.abs(deltaTime) > 0.01) {
      updates.start = finalStart;
      updates.end = finalEnd;
    }

    if (Object.keys(updates).length > 0) {
      const historyDescription = shouldInsertTrack ? "插入轨道" : "移动片段";
      onClipUpdate(itemId, updates, { historyDescription });
    }

    // 调用拖拽结束回调
    onDragEnd?.();
  };

  // 计算时间刻度宽度
  const { displayDuration, scaleContainerWidth } = useMemo(() => {
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth - 270;
    const startLeftOffset = 20;
    const endRightOffset = 20; // 右侧安全距离
    const availableWidth = containerWidth - startLeftOffset - endRightOffset;

    // 计算素材的最远位置（考虑拖动中的位置）
    const maxClipEnd = clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
    const actualMaxEnd = Math.max(maxClipEnd, draggingMaxEnd);

    // 时间轴长度比最大素材长5秒
    const minTimelineDuration = actualMaxEnd + 5;

    // 容器宽度对应的时长
    const containerDisplayTime = availableWidth / pixelsPerSecond;

    // 使用素材时长+5秒和容器时长的最大值
    const displayDuration = Math.max(minTimelineDuration, containerDisplayTime);

    const requiredWidth = displayDuration * pixelsPerSecond + startLeftOffset + endRightOffset;
    const width = Math.max(requiredWidth, containerWidth);

    return {
      displayDuration,
      scaleContainerWidth: width,
    };
  }, [clips, pixelsPerSecond, draggingMaxEnd]);

  // 自动滚动：保持播放头在可见区域内
  useEffect(() => {
    if (!scrollbarRef.current) return;

    const playheadPosition = currentTime * pixelsPerSecond + 20;
    const scrollLeft = scrollbarRef.current.getScrollLeft();
    const containerWidth = scrollbarRef.current.getClientWidth();
    const visibleLeft = scrollLeft;
    const visibleRight = scrollLeft + containerWidth;

    // 如果播放头在可见区域左侧之外
    if (playheadPosition < visibleLeft + 50) {
      scrollbarRef.current.scrollLeft(Math.max(0, playheadPosition - 100));
    }
    // 如果播放头在可见区域右侧之外
    else if (playheadPosition > visibleRight - 50) {
      scrollbarRef.current.scrollLeft(playheadPosition - containerWidth + 100);
    }
  }, [currentTime, pixelsPerSecond]);

  return (
    <div
      className="relative flex flex-col h-full bg-white nowheel nodrag nopan"
      data-nowheel="true"
      data-nodrag="true"
      data-nopan="true"
      onClick={(e) => {
        // 只有点击的是容器本身时才取消选中，避免误触
        if (e.target === e.currentTarget) {
          onClipSelect(null);
        }
      }}
    >
      {/* 顶部固定区域：播放头图标空间 */}
      <div
        style={{
          height: "10px",
          backgroundColor: "#ffffff",
          flexShrink: 0,
          position: "relative",
        }}
      />

      {/* 时间刻度 - 固定在顶部 */}
      <div
        ref={scaleRef}
        style={{
          position: "sticky",
          top: 0,
          width: "100%", // 占满整个容器宽度
          height: "32px",
          backgroundColor: "#ffffff",
          flexShrink: 0,
          zIndex: 100,
          cursor: "pointer",
          overflow: "hidden", // 隐藏超出的刻度
        }}
        onClick={(e) => {
          // 阻止事件冒泡，避免触发父容器的取消选中
          e.stopPropagation();
          // 点击刻度时定位播放头
          const scaleRect = scaleRef.current?.getBoundingClientRect();
          if (!scaleRect) return;

          // 确保使用最新的 reactflowScale 值（从 props 中读取，避免闭包问题）
          const currentReactflowScale = reactflowScale;

          // 计算点击位置：鼠标位置相对于刻度容器 + 滚动偏移 - 左侧起始偏移20px
          const relativeX = (e.clientX - scaleRect.left) / currentReactflowScale;
          const clickX = relativeX + scaleScrollLeft - 20;

          const maxClipEnd = clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
          const playheadWidthTime = 2 / pixelsPerSecond; // 播放头宽度2px对应的时间
          const maxClickTime = maxClipEnd - playheadWidthTime;
          const clickTime = Math.max(0, Math.min(clickX / pixelsPerSecond, maxClickTime));
          onTimeChange(clickTime);
        }}
      >
        <div style={{ transform: `translateX(-${scaleScrollLeft}px)` }}>
          <TimelineScale scale={timeScaleValue} scaleSplitCount={5} scaleWidth={fixedScaleWidth} startLeft={20} duration={displayDuration} width={scaleContainerWidth} height={32} />
        </div>
      </div>

      {/* 轨道滚动区域 */}
      <div
        className="flex-1 overflow-y-auto"
        onWheelCapture={(e: React.WheelEvent<HTMLDivElement>) => {
          if (e.ctrlKey || e.metaKey) {
            // 拦截组合键缩放
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onWheel={(e: React.WheelEvent<HTMLDivElement>) => {
          if (e.ctrlKey || e.metaKey) {
            // 拦截组合键缩放
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <ThinScrollbar ref={scrollbarRef} className="flex-1" onScroll={handleScroll}>
          <div ref={containerRef}>
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragMove={handleDragMove} modifiers={[snapModifier]} collisionDetection={closestCenter}>
              <div
                style={{
                  position: "relative",
                  minWidth: `${scaleContainerWidth}px`,
                  paddingTop: "10px",
                  overflow: "visible", // 允许拖动的素材显示在容器外
                }}
              >
                {/* 轨道 - 只显示有素材的轨道 */}
                {trackData.trackCount === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#9ca3af",
                      fontSize: "14px",
                    }}
                  >
                    {t("timeline.addMediaPrompt")}
                  </div>
                ) : (
                  <>
                    {Array.from({ length: trackData.trackCount }).map((_, index) => (
                      <div
                        key={`track-wrapper-${index}`}
                        style={{
                          position: "relative",
                        }}
                      >
                        {/* 0号轨道顶部的插入指示线（当0号轨道素材与其他素材重合时显示） */}
                        {index === 0 && isHoverAboveFirstTrack && (
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              width: "100%",
                              height: "1px",
                              backgroundColor: "#3b82f6",
                              zIndex: 50,
                              pointerEvents: "none",
                              boxShadow: "0 0 8px rgba(59, 130, 246, 0.6)",
                            }}
                          />
                        )}
                        {/* 轨道上方的插入指示线 */}
                        {hoverTrackIndex === index && (
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              width: "100%",
                              height: "1px",
                              backgroundColor: "#3b82f6",
                              zIndex: 50,
                              pointerEvents: "none",
                              boxShadow: "0 0 8px rgba(59, 130, 246, 0.6)",
                            }}
                          />
                        )}
                        <DroppableTrackRow
                          trackIndex={index}
                          clips={trackData.tracks[index] || []}
                          allClips={clips}
                          mediaItems={mediaItems}
                          selectedClipId={selectedClipId}
                          pixelsPerSecond={pixelsPerSecond}
                          containerRef={containerRef}
                          onClipSelect={onClipSelect}
                          onClipResize={handleClipResize}
                          onClipResizeEnd={onClipResizeEnd}
                          onShowSnapLines={setSnapLines}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </DndContext>
          </div>

          {/* 吸附辅助线（虚线）- 覆盖整个容器高度 */}
          {snapLines.map((snapTime) => (
            <div
              key={`snap-${snapTime}`}
              style={{
                position: "absolute",
                left: `${snapTime * pixelsPerSecond + 20}px`,
                top: 0,
                height: "100%",
                width: "0",
                zIndex: 45,
                pointerEvents: "none",
                borderLeft: "2px dashed #3b82f6",
                opacity: 0.8,
              }}
            />
          ))}
        </ThinScrollbar>
      </div>

      {/* 播放头游标 - 固定不滚动，跟随横向滚动 */}
      {trackData.trackCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: "18px", // 从顶部图标区域下方开始
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none", // 不阻挡鼠标事件
            zIndex: 105,
          }}
        >
          <PlaybackCursor currentTime={currentTime} clips={clips} pixelsPerSecond={pixelsPerSecond} onTimeChange={onTimeChange} onShowSnapLines={setSnapLines} containerRef={containerRef} scrollLeft={scaleScrollLeft} getScrollLeft={getScrollLeft} reactflowScale={reactflowScale} />
        </div>
      )}
    </div>
  );
};

// 自定义比较函数，确保 clips 变化时强制重新渲染
const arePropsEqual = (prevProps: TimelineEditorProps, nextProps: TimelineEditorProps) => {
  // clips 数组引用变化或长度变化时，必须重新渲染
  const clipsChanged = prevProps.clips !== nextProps.clips || prevProps.clips.length !== nextProps.clips.length;

  if (clipsChanged) {
    console.log("🔄 [TimelineEditor] clips 变化，强制重新渲染", {
      prevLength: prevProps.clips.length,
      nextLength: nextProps.clips.length,
      相同引用: prevProps.clips === nextProps.clips,
    });
    return false; // 返回 false 表示需要重新渲染
  }

  // 其他关键 props 的比较（包括 reactflowScale）
  return (
    prevProps.currentTime === nextProps.currentTime && prevProps.duration === nextProps.duration && prevProps.scale === nextProps.scale && prevProps.selectedClipId === nextProps.selectedClipId && prevProps.mediaItems === nextProps.mediaItems && prevProps.reactflowScale === nextProps.reactflowScale // 添加 reactflowScale 的比较
  );
};

export const TimelineEditor = React.memo(TimelineEditorComponent, arePropsEqual);
