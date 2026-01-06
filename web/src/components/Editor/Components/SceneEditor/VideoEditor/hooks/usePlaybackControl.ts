import { useEffect } from "react";

/**
 * 播放控制Hook的参数接口
 */
interface UsePlaybackControlProps {
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 实际时长（所有片段的最大结束时间） */
  actualDuration: number;
  /** 时间轴缩放等级（1-10） */
  scale: number;
  /** 设置当前时间的函数 */
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  /** 设置播放状态的函数 */
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 播放控制自定义Hook
 * 
 * 管理视频编辑器的播放功能，包括：
 * - 播放/暂停切换
 * - 自动播放更新（60fps）
 * - 播放到末尾自动停止
 * - 从末尾重新播放时自动回到开始
 * - 播放头拖动事件处理
 * 
 * @param props - 播放控制所需的参数
 * @returns 包含播放控制相关回调函数的对象
 * 
 * @example
 * ```tsx
 * const {
 *   handlePlayPause,
 *   handleTimeChange,
 *   handleCursorDragStart,
 *   handleCursorDragEnd
 * } = usePlaybackControl({
 *   isPlaying,
 *   currentTime,
 *   actualDuration,
 *   scale,
 *   setCurrentTime,
 *   setIsPlaying
 * });
 * 
 * // 使用播放/暂停功能
 * <button onClick={handlePlayPause}>
 *   {isPlaying ? '暂停' : '播放'}
 * </button>
 * ```
 */
export const usePlaybackControl = ({
  isPlaying,
  currentTime,
  actualDuration,
  scale,
  setCurrentTime,
  setIsPlaying,
}: UsePlaybackControlProps) => {
  /**
   * 处理播放/暂停切换
   * 
   * 特殊逻辑：
   * - 如果当前在末尾，点击播放会从头开始
   * - 否则切换播放/暂停状态
   */
  const handlePlayPause = () => {
    const playheadWidthTime = 2 / (scale * 50);
    const maxPlayheadTime = actualDuration - playheadWidthTime;

    if (currentTime >= maxPlayheadTime - 0.1 && !isPlaying) {
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  /**
   * 处理时间变化
   * @param time - 新的时间位置（秒）
   */
  const handleTimeChange = (time: number) => {
    setCurrentTime(time);
  };

  /**
   * 处理播放头拖动开始
   * @param time - 拖动开始时的时间位置（秒）
   */
  const handleCursorDragStart = (time: number) => {
    console.log("开始拖动播放头:", time);
  };

  /**
   * 处理播放头拖动结束
   * @param time - 拖动结束时的时间位置（秒）
   */
  const handleCursorDragEnd = (time: number) => {
    console.log("结束拖动播放头:", time);
  };

  // 自动播放更新
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          const nextTime = prev + 0.033;
          const playheadWidthTime = 2 / (scale * 50);
          const maxTime = actualDuration - playheadWidthTime;
          if (nextTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return nextTime;
        });
      }, 33);
      return () => clearInterval(interval);
    }
    return;
  }, [isPlaying, actualDuration, scale, setCurrentTime, setIsPlaying]);

  return {
    handlePlayPause,
    handleTimeChange,
    handleCursorDragStart,
    handleCursorDragEnd,
  };
};

