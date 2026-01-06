import { useMemo, useEffect } from "react";
import { TimelineClip } from "../types";

/**
 * 轨道数据处理结果
 */
interface TrackDataResult {
  /** 按轨道索引分组的片段数据 */
  tracks: { [key: number]: TimelineClip[] };
  /** 轨道总数 */
  trackCount: number;
  /** 轨道索引映射关系（旧索引 -> 新索引） */
  trackIndexMap: { [oldIndex: number]: number };
}

/**
 * 轨道数据管理自定义Hook
 * 
 * 负责处理时间轴轨道的分组、过滤空轨道和重映射索引
 * 
 * 功能：
 * 1. 按轨道索引对片段进行分组
 * 2. 在正常模式下，自动删除空轨道并重映射索引
 * 3. 在插入模式下（preserveEmptyTracks=true），保留所有轨道（包括空轨道）
 * 
 * @param clips - 所有时间轴片段的数组
 * @param preserveEmptyTracks - 是否保留空轨道（插入模式时为true）
 * @param onTracksRemapped - 当轨道重映射时的回调函数，接收索引映射关系
 * @returns 包含分组后的轨道数据、轨道数量和索引映射的对象
 * 
 * @example
 * ```tsx
 * const trackData = useTrackData(clips, false, (indexMap) => {
 *   console.log('轨道重映射:', indexMap);
 * });
 * // 访问轨道0的所有片段
 * const track0Clips = trackData.tracks[0];
 * ```
 */
export const useTrackData = (
  clips: TimelineClip[],
  preserveEmptyTracks: boolean,
  onTracksRemapped?: (trackIndexMap: { [oldIndex: number]: number }) => void
): TrackDataResult => {
  const trackData = useMemo(() => {
    const tracks: { [key: number]: TimelineClip[] } = {};
    clips.forEach((clip) => {
      if (!tracks[clip.trackIndex]) {
        tracks[clip.trackIndex] = [];
      }
      tracks[clip.trackIndex].push(clip);
    });

    // 如果需要保留空轨道（插入模式）
    if (preserveEmptyTracks) {
      console.log("🔧 保留所有轨道（包括空轨道）");
      const maxTrackIndex = Math.max(...Object.keys(tracks).map(Number), 0);
      const allTracks: { [key: number]: TimelineClip[] } = {};
      for (let i = 0; i <= maxTrackIndex; i++) {
        allTracks[i] = tracks[i] || [];
      }
      return {
        tracks: allTracks,
        trackCount: maxTrackIndex + 1,
        trackIndexMap: {},
      };
    }

    // 正常模式：过滤空轨道并重映射
    const usedTrackIndexes = Object.keys(tracks)
      .map(Number)
      .filter((index) => tracks[index].length > 0)
      .sort((a, b) => a - b);

    const trackCount = usedTrackIndexes.length;

    // 重新映射轨道索引，消除空轨道
    const trackIndexMap: { [oldIndex: number]: number } = {};
    usedTrackIndexes.forEach((oldIndex, newIndex) => {
      trackIndexMap[oldIndex] = newIndex;
    });

    // 创建新的轨道数据，使用连续的索引
    const remappedTracks: { [key: number]: TimelineClip[] } = {};
    usedTrackIndexes.forEach((oldIndex, newIndex) => {
      remappedTracks[newIndex] = tracks[oldIndex];
    });

    return {
      tracks: remappedTracks,
      trackCount,
      trackIndexMap,
    };
  }, [clips, preserveEmptyTracks]);

  // 监听轨道映射变化，通知父组件更新片段轨道索引
  useEffect(() => {
    if (preserveEmptyTracks) {
      console.log("⏸️ 插入模式期间跳过自动重映射");
      return;
    }

    if (trackData.trackIndexMap && onTracksRemapped) {
      const needsRemapping = Object.keys(trackData.trackIndexMap).some(
        (oldIndex) =>
          Number(oldIndex) !== trackData.trackIndexMap[Number(oldIndex)]
      );
      if (needsRemapping) {
        console.log("🔄 普通模式：执行轨道重映射，删除空轨道");
        onTracksRemapped(trackData.trackIndexMap);
      }
    }
  }, [trackData.trackIndexMap, onTracksRemapped, preserveEmptyTracks]);

  return trackData;
};

