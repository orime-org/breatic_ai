import { useRef } from "react";
import { Modifier } from "@dnd-kit/core";
import { TimelineClip } from "../types";
import { snapToPosition } from "../utils/timelineUtils";

/**
 * 时间轴吸附自定义Hook
 * 
 * 实现拖动片段时的智能吸附功能，可以吸附到：
 * - 播放头位置
 * - 其他片段的开始/结束位置
 * 
 * 吸附特性：
 * - 吸附阈值：0.1秒（约5像素）
 * - 脱离阈值：0.15秒（需要明显拖动才能脱离吸附）
 * - 吸附时有视觉反馈（吸附线）
 * 
 * @param isDragging - 是否正在拖动
 * @param clips - 所有时间轴片段的数组
 * @param currentTime - 当前播放时间（秒）
 * @param pixelsPerSecond - 每秒对应的像素数（用于转换时间和像素）
 * @returns 包含吸附修饰器和重置函数的对象
 * 
 * @example
 * ```tsx
 * const { snapModifier, resetSnap } = useTimelineSnap(
 *   isDragging, 
 *   clips, 
 *   currentTime, 
 *   pixelsPerSecond
 * );
 * 
 * // 在DndContext中使用
 * <DndContext modifiers={[snapModifier]}>
 *   ...
 * </DndContext>
 * 
 * // 拖动开始时重置吸附状态
 * resetSnap();
 * ```
 */
export const useTimelineSnap = (
  isDragging: boolean,
  clips: TimelineClip[],
  currentTime: number,
  pixelsPerSecond: number
) => {
  const lastSnapRef = useRef<{ time: number; isSnapped: boolean }>({
    time: 0,
    isSnapped: false,
  });

  const snapModifier: Modifier = ({ transform, active }: any) => {
    if (!isDragging) return transform;

    const itemId = active.id as string;
    const clip = clips.find((c) => c.id === itemId);
    if (!clip) return transform;

    const deltaTime = transform.x / pixelsPerSecond;
    const newStart = Math.max(0, clip.start + deltaTime);

    const snapResult = snapToPosition(newStart, currentTime, clips, itemId);
    const snappedStart = snapResult.time;

    const snapDistance = Math.abs(newStart - snappedStart);
    const breakAwayThreshold = 0.15;

    if (lastSnapRef.current.isSnapped) {
      const distanceFromLastSnap = Math.abs(
        newStart - lastSnapRef.current.time
      );

      if (distanceFromLastSnap < breakAwayThreshold) {
        return {
          ...transform,
          x: (lastSnapRef.current.time - clip.start) * pixelsPerSecond,
        };
      } else {
        lastSnapRef.current.isSnapped = false;
      }
    }

    if (snapDistance < 0.1 && snapResult.snapLines.length > 0) {
      lastSnapRef.current = { time: snappedStart, isSnapped: true };
      const snapOffset = (snappedStart - clip.start) * pixelsPerSecond;
      return {
        ...transform,
        x: snapOffset,
      };
    }

    return transform;
  };

  const resetSnap = () => {
    lastSnapRef.current = { time: 0, isSnapped: false };
  };

  return { snapModifier, resetSnap };
};

