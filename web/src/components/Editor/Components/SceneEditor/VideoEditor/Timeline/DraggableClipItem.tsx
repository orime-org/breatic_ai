import React, { useState, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { MediaItem, TimelineClip } from "../types";
import soundWaveImg from "../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/soundWave.png";

interface DraggableClipItemProps {
  clip: TimelineClip;
  media: MediaItem | undefined;
  isSelected: boolean;
  pixelsPerSecond: number;
  allClips: TimelineClip[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (id: string) => void;
  onResize: (
    clipId: string,
    newStart: number,
    newEnd: number,
    edge: "left" | "right"
  ) => void;
  onResizeEnd?: () => void;
  onShowSnapLines: (lines: number[]) => void;
}

const DraggableClipItemComponent: React.FC<DraggableClipItemProps> = ({
  clip,
  media,
  isSelected,
  pixelsPerSecond,
  allClips,
  containerRef,
  onSelect,
  onResize,
  onResizeEnd,
  onShowSnapLines,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: clip.id,
    data: { clip },
    disabled: isResizing,
  });

  // 片段调整大小事件
  // 处理左边缘调整大小
  const handleLeftResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const originalStart = clip.start;
    const originalEnd = clip.end;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const rawStart = Math.max(
        0,
        Math.min(originalStart + deltaTime, originalEnd - 0.1)
      );

      // 收集吸附点（其他素材的边缘）
      const snapPoints: number[] = [];
      allClips.forEach((otherClip) => {
        if (otherClip.id !== clip.id) {
          snapPoints.push(otherClip.start);
          snapPoints.push(otherClip.end);
        }
      });
      snapPoints.push(0);

      // 吸附逻辑
      const snapThreshold = 0.1;
      let snappedStart = rawStart;
      let minDistance = Infinity;
      let snapLine: number | null = null;

      snapPoints.forEach((point) => {
        const distance = Math.abs(rawStart - point);
        if (distance < snapThreshold && distance < minDistance) {
          minDistance = distance;
          snappedStart = point;
          snapLine = point;
        }
      });

      if (snapLine !== null) {
        onShowSnapLines([snapLine]);
      } else {
        onShowSnapLines([]);
      }

      onResize(clip.id, snappedStart, originalEnd, "left");
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onShowSnapLines([]);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // 调整大小结束时保存历史记录
      if (onResizeEnd) {
        onResizeEnd();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 处理右边缘调整大小
  const handleRightResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const originalStart = clip.start;
    const originalEnd = clip.end;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const rawEnd = Math.max(originalStart + 0.1, originalEnd + deltaTime);

      // 收集吸附点（其他素材的边缘）
      const snapPoints: number[] = [];
      allClips.forEach((otherClip) => {
        if (otherClip.id !== clip.id) {
          snapPoints.push(otherClip.start);
          snapPoints.push(otherClip.end);
        }
      });

      // 吸附逻辑
      const snapThreshold = 0.1;
      let snappedEnd = rawEnd;
      let minDistance = Infinity;
      let snapLine: number | null = null;

      snapPoints.forEach((point) => {
        const distance = Math.abs(rawEnd - point);
        if (distance < snapThreshold && distance < minDistance) {
          minDistance = distance;
          snappedEnd = point;
          snapLine = point;
        }
      });

      if (snapLine !== null) {
        onShowSnapLines([snapLine]);
      } else {
        onShowSnapLines([]);
      }

      onResize(clip.id, originalStart, snappedEnd, "right");
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onShowSnapLines([]);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // 调整大小结束时保存历史记录
      if (onResizeEnd) {
        onResizeEnd();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 获取缩略图或背景图URL
  const backgroundUrl =
    media?.type === "video"
      ? media.thumbnail
      : media?.type === "image"
      ? media.url
      : media?.type === "audio"
      ? soundWaveImg // 使用静态音频波形图片
      : null;

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${clip.start * pixelsPerSecond}px`,
    width: `${(clip.end - clip.start) * pixelsPerSecond}px`,
    height: "28px",
    top: "0",
    backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : "none",
    backgroundColor:
      media?.type === "text"
        ? "#77C562"
        : media?.type === "audio"
        ? "#CD9541" // 音频轨道背景色
        : backgroundUrl
        ? "transparent"
        : "#77C562",
    backgroundSize:
      media?.type === "video" || media?.type === "image"
        ? "auto 100%"
        : media?.type === "audio"
        ? "auto 60%" // 音频波形图高度为轨道的60%
        : "auto",
    backgroundRepeat: "repeat-x", // 所有类型都水平平铺
    backgroundPosition: "left center",
    border: isSelected
      ? "2px solid #3b82f6"
      : "1px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    display: "flex",
    alignItems: "flex-end",
    overflow: "hidden",
    boxShadow: isSelected ? "0 0 0 2px rgba(59, 130, 246, 0.3)" : "none",
    cursor: isResizing ? "ew-resize" : "grab",
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    userSelect: "none",
    zIndex: transform ? 100 : 10,
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseDownPos.current) return;

    const deltaX = Math.abs(e.clientX - mouseDownPos.current.x);
    const deltaY = Math.abs(e.clientY - mouseDownPos.current.y);
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

    if (distance < 5) {
      e.stopPropagation();
      onSelect(clip.id);
    }

    mouseDownPos.current = null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* 左侧调整手柄 */}
      {isSelected && (
        <div
          onMouseDown={handleLeftResize}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "10px",
            cursor: "ew-resize",
            backgroundColor: "rgba(59, 130, 246, 0.3)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* 拖拽指示器 - 两根竖线 */}
          <div
            style={{
              display: "flex",
              gap: "1px",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "1px",
                height: "14px",
                backgroundColor: "#3b82f6",
                borderRadius: "0.5px",
              }}
            />
            <div
              style={{
                width: "1px",
                height: "14px",
                backgroundColor: "#3b82f6",
                borderRadius: "0.5px",
              }}
            />
          </div>
        </div>
      )}

      {/* 右侧调整手柄 */}
      {isSelected && (
        <div
          onMouseDown={handleRightResize}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "10px",
            cursor: "ew-resize",
            backgroundColor: "rgba(59, 130, 246, 0.3)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* 拖拽指示器 - 两根竖线 */}
          <div
            style={{
              display: "flex",
              gap: "1px",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "1px",
                height: "14px",
                backgroundColor: "#3b82f6",
                borderRadius: "0.5px",
              }}
            />
            <div
              style={{
                width: "1px",
                height: "14px",
                backgroundColor: "#3b82f6",
                borderRadius: "0.5px",
              }}
            />
          </div>
        </div>
      )}

      {/* 文本或素材名称 */}
      {media?.type === "text" || Object.keys(media || {}).length === 0 ? (
        // 文本素材：左对齐显示 Aa 图标和文本
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "0 12px",
            gap: "6px",
            width: "100%",
            height: "100%",
            color: "white",
            fontSize: "12px",
            fontWeight: "600",
            overflow: "hidden",
          }}
        >
          <img
            src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/fonts.png")}
            alt="字体"
            style={{
              width: "16px",
              height: "16px",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {clip.text || "Text"}
          </span>
        </div>
      ) : (
        // 其他素材：显示素材名称标签
        <div
          style={{
            background: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "1px 6px",
            fontSize: "10px",
            width: "100%",
            position: "relative",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontWeight: "500",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {media?.name || "未知素材"}
          </div>
        </div>
      )}
    </div>
  );
};

// 自定义比较函数，确保 clip 变化时重新渲染
const arePropsEqual = (
  prevProps: DraggableClipItemProps,
  nextProps: DraggableClipItemProps
) => {
  // clip 对象引用变化时，必须重新渲染
  const clipChanged = prevProps.clip !== nextProps.clip;

  if (clipChanged) {
    return false; // 需要重新渲染
  }

  // 其他 props 比较
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.pixelsPerSecond === nextProps.pixelsPerSecond &&
    prevProps.media === nextProps.media
  );
};

export const DraggableClipItem = React.memo(
  DraggableClipItemComponent,
  arePropsEqual
);