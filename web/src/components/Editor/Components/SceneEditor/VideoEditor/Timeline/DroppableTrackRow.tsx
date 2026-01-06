import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { MediaItem, TimelineClip } from "../types";
import { DraggableClipItem } from "./DraggableClipItem";

interface DroppableTrackRowProps {
  trackIndex: number;
  clips: TimelineClip[];
  allClips: TimelineClip[];
  mediaItems: MediaItem[];
  selectedClipId: string | null;
  pixelsPerSecond: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClipSelect: (id: string) => void;
  onClipResize: (
    clipId: string,
    newStart: number,
    newEnd: number,
    edge: "left" | "right"
  ) => void;
  onClipResizeEnd?: () => void;
  onShowSnapLines: (lines: number[]) => void;
}

const DroppableTrackRowComponent: React.FC<DroppableTrackRowProps> = ({
  trackIndex,
  clips,
  allClips,
  mediaItems,
  selectedClipId,
  pixelsPerSecond,
  containerRef,
  onClipSelect,
  onClipResize,
  onClipResizeEnd,
  onShowSnapLines,
}) => {
  const { setNodeRef } = useDroppable({
    id: `track-${trackIndex}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        width: "calc(100% - 20px)", // 使用100%宽度减去左边距跟随父容器
        height: "28px",
        marginBottom: "10px",
        marginLeft: "20px",
        backgroundColor: "#F0F4F6",
        position: "relative",
        overflow: "visible",
      }}
    >
      {clips.map((clip) => {
        const media = mediaItems.find((item) => item.id === clip.mediaId);
        return (
          <DraggableClipItem
            key={clip.id}
            clip={clip}
            media={media}
            isSelected={selectedClipId === clip.id}
            pixelsPerSecond={pixelsPerSecond}
            allClips={allClips}
            containerRef={containerRef}
            onSelect={onClipSelect}
            onResize={onClipResize}
            onResizeEnd={onClipResizeEnd}
            onShowSnapLines={onShowSnapLines}
          />
        );
      })}
    </div>
  );
};

// 自定义比较函数，确保 clips 变化时重新渲染
const arePropsEqual = (
  prevProps: DroppableTrackRowProps,
  nextProps: DroppableTrackRowProps
) => {
  // clips 数组引用或长度变化时，必须重新渲染
  const clipsChanged =
    prevProps.clips !== nextProps.clips ||
    prevProps.clips.length !== nextProps.clips.length;

  if (clipsChanged) {
    return false; // 需要重新渲染
  }

  // 其他 props 比较
  return (
    prevProps.trackIndex === nextProps.trackIndex &&
    prevProps.selectedClipId === nextProps.selectedClipId &&
    prevProps.pixelsPerSecond === nextProps.pixelsPerSecond &&
    prevProps.allClips === nextProps.allClips
  );
};

export const DroppableTrackRow = React.memo(
  DroppableTrackRowComponent,
  arePropsEqual
);
