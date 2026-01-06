import { useMemo } from "react";

/**
 * 时间轴缩放参数
 */
interface ScaleParams {
  /** 每个刻度代表的时间值（秒） */
  timeScaleValue: number;
  /** 每秒对应的像素数 */
  pixelsPerSecond: number;
  /** 固定的刻度宽度（像素） */
  fixedScaleWidth: number;
}

/**
 * 时间轴缩放自定义Hook
 * 
 * 根据缩放等级（1-10）计算时间轴的显示参数
 * - scale 1: 60秒/刻度（最大缩放）
 * - scale 10: 1秒/刻度（最小缩放，刻度更宽）
 * 
 * @param scale - 缩放等级，范围 1-10
 * @returns 包含时间刻度值、像素比例和刻度宽度的对象
 * 
 * @example
 * ```tsx
 * const { pixelsPerSecond, timeScaleValue } = useTimelineScale(5);
 * // pixelsPerSecond: 10, timeScaleValue: 10秒
 * ```
 */
export const useTimelineScale = (scale: number): ScaleParams => {
  return useMemo(() => {
    let timeScaleValue: number;
    let fixedScaleWidth: number;

    switch (scale) {
      case 1:
        timeScaleValue = 60;
        fixedScaleWidth = 100;
        break;
      case 2:
        timeScaleValue = 30;
        fixedScaleWidth = 100;
        break;
      case 3:
        timeScaleValue = 20;
        fixedScaleWidth = 100;
        break;
      case 4:
        timeScaleValue = 15;
        fixedScaleWidth = 100;
        break;
      case 5:
        timeScaleValue = 10;
        fixedScaleWidth = 100;
        break;
      case 6:
        timeScaleValue = 5;
        fixedScaleWidth = 100;
        break;
      case 7:
        timeScaleValue = 3;
        fixedScaleWidth = 100;
        break;
      case 8:
        timeScaleValue = 2;
        fixedScaleWidth = 100;
        break;
      case 9:
        timeScaleValue = 1;
        fixedScaleWidth = 100;
        break;
      case 10:
        timeScaleValue = 1;
        fixedScaleWidth = 150;
        break;
      default:
        timeScaleValue = 10;
        fixedScaleWidth = 100;
    }

    const pixelsPerSecond = fixedScaleWidth / timeScaleValue;
    return { timeScaleValue, pixelsPerSecond, fixedScaleWidth };
  }, [scale]);
};

