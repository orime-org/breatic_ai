import { TimelineClip } from "../types";

/**
 * 检查片段碰撞
 * 
 * 判断指定的时间范围是否与同一轨道上的其他片段发生重叠
 * 
 * 碰撞条件：两个片段在时间轴上有重叠
 * - start < otherClip.end && end > otherClip.start
 * 
 * @param clips - 所有时间轴片段的数组
 * @param clipId - 当前片段的ID（用于排除自身）
 * @param trackIndex - 目标轨道索引
 * @param start - 片段开始时间（秒）
 * @param end - 片段结束时间（秒）
 * @returns 如果发生碰撞返回true，否则返回false
 * 
 * @example
 * ```ts
 * const hasCollision = checkCollision(clips, 'clip-1', 0, 5, 10);
 * if (hasCollision) {
 *   console.log('片段位置与其他片段重叠');
 * }
 * ```
 */
export const checkCollision = (
  clips: TimelineClip[],
  clipId: string,
  trackIndex: number,
  start: number,
  end: number
): boolean => {
  const tracksClips = clips.filter(
    (c) => c.trackIndex === trackIndex && c.id !== clipId
  );

  for (const otherClip of tracksClips) {
    if (start < otherClip.end && end > otherClip.start) {
      return true;
    }
  }
  return false;
};

/**
 * 智能吸附位置计算
 * 
 * 根据给定时间，计算最近的吸附点并返回吸附后的时间
 * 
 * 吸附点包括：
 * 1. 播放头当前位置
 * 2. 其他片段的开始位置
 * 3. 其他片段的结束位置
 * 
 * 吸附规则：
 * - 吸附阈值：0.1秒（约5像素）
 * - 在阈值范围内选择最近的吸附点
 * - 如果没有吸附点，保持原始时间
 * 
 * @param time - 原始时间（秒）
 * @param currentTime - 当前播放时间（秒）
 * @param clips - 所有时间轴片段的数组
 * @param currentClipId - 当前片段的ID（可选，用于排除自身）
 * @returns 包含吸附后时间和吸附线位置数组的对象
 * 
 * @example
 * ```ts
 * const result = snapToPosition(5.05, 5.0, clips, 'clip-1');
 * // result.time: 5.0 (吸附到播放头)
 * // result.snapLines: [5.0] (显示吸附线的位置)
 * ```
 */
export const snapToPosition = (
  time: number,
  currentTime: number,
  clips: TimelineClip[],
  currentClipId?: string
): { time: number; snapLines: number[] } => {
  const snapThreshold = 0.1;
  const detectedSnapLines: number[] = [];
  let snappedTime = time;
  let minDistance = Infinity;

  const snapPoints: { time: number; label: string }[] = [];

  // 1. 播放头位置
  snapPoints.push({ time: currentTime, label: "cursor" });

  // 2. 其他素材的开始和结束位置
  clips.forEach((clip) => {
    if (clip.id !== currentClipId) {
      snapPoints.push({ time: clip.start, label: "clip-start" });
      snapPoints.push({ time: clip.end, label: "clip-end" });
    }
  });

  // 3. 找到最近的吸附点
  snapPoints.forEach((point) => {
    const distance = Math.abs(time - point.time);
    if (distance < snapThreshold && distance < minDistance) {
      minDistance = distance;
      snappedTime = point.time;
      if (!detectedSnapLines.includes(point.time)) {
        detectedSnapLines.push(point.time);
      }
    }
  });

  return { time: snappedTime, snapLines: detectedSnapLines };
};

