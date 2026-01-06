import React from "react";
import { TimelineClip } from "../types";

interface PlaybackCursorProps {
  currentTime: number;
  clips: TimelineClip[];
  pixelsPerSecond: number;
  onTimeChange: (time: number) => void;
  onShowSnapLines: (lines: number[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollLeft: number; // 从父组件传递滚动偏移
  getScrollLeft: () => number; // 获取实时滚动位置的函数
  reactflowScale?: number; // ReactFlow 节点的缩放系数（默认 1.0）
}

const PlaybackCursorComponent: React.FC<PlaybackCursorProps> = ({
  currentTime,
  clips,
  pixelsPerSecond,
  onTimeChange,
  onShowSnapLines,
  containerRef,
  scrollLeft,
  getScrollLeft,
  reactflowScale = 1.0, // 默认缩放系数为 1（无缩放）
}) => {
  // 播放头位置，考虑滚动偏移
  const playheadLeft = currentTime * pixelsPerSecond + 20 - scrollLeft;

  // 播放指针拖动事件
  const handleCursorDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startTime = currentTime;
    const startScrollLeft = getScrollLeft();

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const currentScrollLeft = getScrollLeft();
      const scrollDelta = currentScrollLeft - startScrollLeft;
      
      // 考虑 ReactFlow 缩放：鼠标移动距离需要除以缩放系数
      // 因为 clientX 是屏幕坐标，而我们需要的是相对于容器的坐标
      const deltaX = (moveEvent.clientX - startX) / reactflowScale + scrollDelta;
      const deltaTime = deltaX / pixelsPerSecond;

      // 限制在素材最大长度内（减去播放头宽度对应的时间）
      const maxClipEnd = clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
      const playheadWidthTime = 2 / pixelsPerSecond; // 播放头宽度2px对应的时间
      const maxDragTime = maxClipEnd - playheadWidthTime;
      const rawTime = Math.max(0, Math.min(maxDragTime, startTime + deltaTime));

      // 收集吸附点
      const snapPoints: number[] = [];
      clips.forEach((clip) => {
        snapPoints.push(clip.start);
        snapPoints.push(clip.end);
      });

      // 吸附逻辑
      const snapThreshold = 0.1;
      let snappedTime = rawTime;
      let minDistance = Infinity;

      snapPoints.forEach((point) => {
        const distance = Math.abs(rawTime - point);
        if (distance < snapThreshold && distance < minDistance) {
          minDistance = distance;
          snappedTime = point;
        }
      });

      // 显示吸附线
      if (minDistance < snapThreshold) {
        onShowSnapLines([snappedTime]);
      } else {
        onShowSnapLines([]);
      }

      onTimeChange(snappedTime);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onShowSnapLines([]);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <>
      {/* 可拖动区域（扩大交互面积） - 最上层但透明 */}
      <div
        style={{
          position: "absolute",
          left: `${playheadLeft - 10}px`,
          top: "-10px", // 从顶部图标开始（18px 图标空间 + 32px 刻度）
          height: "calc(100% + 50px)", // 覆盖所有区域
          width: "20px",
          zIndex: 1, // 在父级容器内最上层
          cursor: "ew-resize",
          userSelect: "none",
          pointerEvents: "auto", // 允许交互
        }}
        onMouseDown={handleCursorDragStart}
        onClick={(e) => {
          // 阻止点击事件冒泡，避免触发父组件的取消选中
          e.stopPropagation();
        }}
      />

      {/* 播放头顶部图标 - 显示在最顶部 */}
      <div
        style={{
          position: "absolute",
          left: `${playheadLeft - 4}px`,
          top: "-18px", // 在顶部图标区域
          width: "10px",
          height: "18px",
          backgroundColor: "#18181B",
          borderRadius: "0 0 5px 5px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: 2, // 在拖动区域之上
          pointerEvents: "none",
        }}
      />

      {/* 播放头线条（视觉元素，不可交互） */}
      <div
        style={{
          position: "absolute",
          left: `${playheadLeft}px`,
          top: "-32px", // 从刻度顶部开始
          height: "calc(100% + 32px)", // 延伸到刻度和轨道
          width: "2px",
          backgroundColor: "#848689",
          zIndex: 0, // 在最底层
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </>
  );
};

export const PlaybackCursor = React.memo(PlaybackCursorComponent);
