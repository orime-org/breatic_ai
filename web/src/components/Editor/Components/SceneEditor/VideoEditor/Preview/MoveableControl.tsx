import React from "react";
import Moveable from "react-moveable";
import { MediaItem, TimelineClip } from "../types";

interface MoveableControlProps {
  clip: TimelineClip;
  media: MediaItem;
  canvasSize: { width: number; height: number };
  zoom?: number; // 缩放比例，用于保持控制框大小不变
  onClipUpdate?: (
    id: string,
    updates: Partial<TimelineClip>,
    options?: { skipHistory?: boolean; historyDescription?: string }
  ) => void;
}

const MoveableControlComponent: React.FC<MoveableControlProps> = ({
  clip,
  media,
  canvasSize,
  zoom = 1,
  onClipUpdate,
}) => {
  const isText = media.type === "text";

  // 根据素材原始比例计算默认尺寸
  let defaultWidth: number | "auto" = "auto";
  let defaultHeight: number | "auto" = "auto";

  if (!isText && media.width && media.height) {
    const mediaRatio = media.width / media.height;
    const maxWidth = canvasSize.width * 0.5;
    const maxHeight = canvasSize.height * 0.5;

    if (media.width > maxWidth || media.height > maxHeight) {
      if (mediaRatio > maxWidth / maxHeight) {
        defaultWidth = maxWidth;
        defaultHeight = maxWidth / mediaRatio;
      } else {
        defaultHeight = maxHeight;
        defaultWidth = maxHeight * mediaRatio;
      }
    } else {
      defaultWidth = media.width;
      defaultHeight = media.height;
    }
  } else if (!isText) {
    defaultWidth = canvasSize.width * 0.5;
    defaultHeight = canvasSize.height * 0.5;
  }

  // 文字控制框默认宽高
  const defaultTextWidth = 120;
  const defaultTextHeight = 30;

  const defaultX = isText
    ? canvasSize.width / 2 - defaultTextWidth / 2
    : (canvasSize.width - (defaultWidth as number)) / 2;
  const defaultY = isText
    ? canvasSize.height / 2 - defaultTextHeight / 2
    : (canvasSize.height - (defaultHeight as number)) / 2;

  const x = clip.x ?? defaultX;
  const y = clip.y ?? defaultY;
  const scale = clip.scale ?? 1;
  const rotation = clip.rotation ?? 0;
  const width =
    clip.width ??
    (typeof defaultWidth === "number"
      ? defaultWidth
      : isText
      ? defaultTextWidth
      : 100);
  const height =
    clip.height ??
    (typeof defaultHeight === "number"
      ? defaultHeight
      : isText
      ? defaultTextHeight
      : 100);

  const handleDrag = (
    translate: number[],
    skipHistory: boolean = true,
    historyDescription?: string
  ) => {
    if (!onClipUpdate) return;
    console.log(`🎯 [MoveableControl] handleDrag called:`, {
      clipId: clip.id,
      translate,
      skipHistory,
      historyDescription,
    });
    onClipUpdate(
      clip.id,
      {
        x: translate[0],
        y: translate[1],
      },
      { skipHistory, historyDescription }
    );
  };

  const handleRotate = (
    rotation: number,
    skipHistory: boolean = true,
    historyDescription?: string
  ) => {
    if (!onClipUpdate) return;
    console.log(`🎯 [MoveableControl] handleRotate called:`, {
      clipId: clip.id,
      rotation,
      skipHistory,
      historyDescription,
    });
    onClipUpdate(clip.id, { rotation }, { skipHistory, historyDescription });
  };

  // 拖拽事件处理
  const handleDragEvent = (e: any) => {
    // 重要：拖动过程中只直接修改DOM，不触发state更新，避免React重新渲染覆盖DOM修改
    e.target.style.transform = `translate(${e.translate[0]}px, ${e.translate[1]}px) rotate(${rotation}deg) scale(${scale})`;
    // 不调用 handleDrag，避免触发重新渲染
    if (e.inputEvent) {
      e.inputEvent.stopPropagation();
    }
  };

  const handleDragStartEvent = (e: any) => {
    if (e.inputEvent) {
      e.inputEvent.stopPropagation();
    }
  };

  const handleDragEndEvent = (e: any) => {
    // 拖动结束时才更新state，同步最终位置
    handleDrag(e.lastEvent?.translate || [x, y], false, "移动元素");
  };

  // 缩放事件处理
  const handleResizeEvent = (e: any) => {
    const direction = e.direction;

    if (isText) {
      // 文字元素的特殊处理
      if (direction[0] === 1 && direction[1] === 0) {
        // 右中控制点 "e"：改变宽度，高度根据内容自动调整
        e.target.style.width = `${e.width}px`;
        e.target.style.height = "auto";

        const targetElement = e.target as HTMLElement;
        const fontSize = clip.textStyle?.fontSize ?? 48;
        const minHeight = Math.max(fontSize * 1.5, 60); // 最小高度根据字号动态计算
        const newHeight = Math.max(targetElement.offsetHeight, minHeight);

        e.target.style.height = `${newHeight}px`;
        e.target.style.transform = `translate(${e.drag.translate[0]}px, ${e.drag.translate[1]}px) rotate(${rotation}deg) scale(${scale})`;
      } else if (direction[0] === 1 && direction[1] === 1) {
        // 右下角控制点 "se"：等比例缩放控制框和字体大小
        const oldWidth = clip.width || width;
        const oldHeight = clip.height || height;
        const aspectRatio = oldWidth / oldHeight;

        const newWidth = e.width;
        const newHeight = newWidth / aspectRatio;

        const scaleRatio = newWidth / oldWidth;
        const currentFontSize = clip.textStyle?.fontSize ?? 48; // 默认字号48
        const newFontSize = Math.round(currentFontSize * scaleRatio);

        e.target.style.width = `${newWidth}px`;
        e.target.style.height = `${newHeight}px`;
        e.target.style.transform = `translate(${e.drag.translate[0]}px, ${e.drag.translate[1]}px) rotate(${rotation}deg) scale(${scale})`;

        const textElement = e.target.querySelector(
          "div[contenteditable]"
        ) as HTMLDivElement;
        if (textElement) {
          textElement.style.fontSize = `${newFontSize}px`;
        }
      }
    } else {
      // 非文字元素的处理
      e.target.style.width = `${e.width}px`;
      e.target.style.height = `${e.height}px`;
      e.target.style.transform = `translate(${e.drag.translate[0]}px, ${e.drag.translate[1]}px) rotate(${rotation}deg) scale(${scale})`;

      // 如果有裁剪区域，实时更新裁剪样式
      if (clip.cropArea && media.width && media.height) {
        const {
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight,
        } = clip.cropArea;

        // 计算缩放比例：将裁剪区域缩放到当前元素尺寸
        const scaleX = e.width / cropWidth;
        const scaleY = e.height / cropHeight;

        // 计算媒体元素的显示尺寸（原始尺寸 × 缩放比例）
        const displayWidth = media.width * scaleX;
        const displayHeight = media.height * scaleY;

        // 计算偏移量：将裁剪区域移动到容器的左上角
        const offsetX = -cropX * scaleX;
        const offsetY = -cropY * scaleY;

        const innerContainer = e.target.firstElementChild as HTMLElement;
        if (innerContainer && innerContainer.classList.contains("absolute")) {
          innerContainer.style.left = `${offsetX}px`;
          innerContainer.style.top = `${offsetY}px`;
          innerContainer.style.width = `${displayWidth}px`;
          innerContainer.style.height = `${displayHeight}px`;
        }
      }
    }

    if (e.inputEvent) {
      e.inputEvent.stopPropagation();
    }
  };

  const handleResizeEndEvent = (e: any) => {
    const target = e.target as HTMLElement;
    const direction = e.lastEvent?.direction;

    if (isText && direction) {
      if (direction[0] === 1 && direction[1] === 0) {
        // 右中控制点 "e"：更新宽度和高度
        if (onClipUpdate) {
          const updates = {
            width: parseFloat(target.style.width),
            height: parseFloat(target.style.height),
            x: e.lastEvent?.drag.translate[0] ?? x,
            y: e.lastEvent?.drag.translate[1] ?? y,
          };
          onClipUpdate(clip.id, updates, {
            skipHistory: false,
            historyDescription: "调整文本框大小",
          });
        }
      } else if (direction[0] === 1 && direction[1] === 1) {
        // 右下角控制点 "se"：等比例缩放，更新宽高和字体大小
        const oldWidth = clip.width || width;
        const newWidth = e.lastEvent.width;
        const newHeight = e.lastEvent.height;
        const scaleRatio = newWidth / oldWidth;
        const currentFontSize = clip.textStyle?.fontSize || 24;
        const newFontSize = Math.round(currentFontSize * scaleRatio);

        if (onClipUpdate) {
          const updates = {
            width: newWidth,
            height: newHeight,
            x: e.lastEvent?.drag.translate[0] ?? x,
            y: e.lastEvent?.drag.translate[1] ?? y,
            textStyle: {
              ...clip.textStyle,
              fontSize: newFontSize,
            },
          };
          onClipUpdate(clip.id, updates, {
            skipHistory: false,
            historyDescription: "缩放文本",
          });
        }
      }
    } else {
      // 非文字元素的处理
      if (onClipUpdate) {
        const newWidth = parseFloat(target.style.width);
        const newHeight = parseFloat(target.style.height);

        // 输出调试信息，帮助检查裁剪区域
        if (clip.cropArea) {
          console.log("📐 元素缩放完成:", {
            媒体类型: media.type,
            原始尺寸: { width, height },
            新尺寸: { width: newWidth, height: newHeight },
            裁剪区域: clip.cropArea,
          });
        }

        const updates = {
          width: newWidth,
          height: newHeight,
          x: e.lastEvent?.drag.translate[0] ?? x,
          y: e.lastEvent?.drag.translate[1] ?? y,
        };
        onClipUpdate(clip.id, updates, {
          skipHistory: false,
          historyDescription: "调整元素大小",
        });
      }
    }
  };

  const handleScaleEvent = (e: any) => {
    const isShiftPressed = e.inputEvent?.shiftKey || false;

    if (isShiftPressed) {
      const newScale = Math.min(e.scale[0], e.scale[1]);
      e.target.style.transform = `translate(${e.drag.translate[0]}px, ${e.drag.translate[1]}px) rotate(${rotation}deg) scale(${newScale})`;
    } else {
      const newScale = e.scale[0];
      e.target.style.transform = `translate(${e.drag.translate[0]}px, ${e.drag.translate[1]}px) rotate(${rotation}deg) scale(${newScale})`;
    }

    if (e.inputEvent) {
      e.inputEvent.stopPropagation();
    }
  };

  const handleScaleEndEvent = (e: any) => {
    if (onClipUpdate) {
      const updates = {
        scale: e.lastEvent?.scale[0] ?? scale,
        x: e.lastEvent?.drag.translate[0] ?? x,
        y: e.lastEvent?.drag.translate[1] ?? y,
      };
      onClipUpdate(clip.id, updates, {
        skipHistory: false,
        historyDescription: "缩放元素",
      });
    }
  };

  const handleRotateEvent = (e: any) => {
    // 旋转过程中只修改DOM，不更新state
    e.target.style.transform = `translate(${x}px, ${y}px) rotate(${e.rotate}deg) scale(${scale})`;
    // 不调用 handleRotate，避免触发重新渲染
    if (e.inputEvent) {
      e.inputEvent.stopPropagation();
    }
  };

  const handleRotateEndEvent = (e: any) => {
    // 旋转结束时才更新state
    handleRotate(e.lastEvent?.rotate ?? rotation, false, "旋转元素");
  };

  // 生成稳定的 moveableKey，确保裁剪后触发重新渲染
  const cropKey = clip.cropArea
    ? `crop-${clip.cropArea.x}-${clip.cropArea.y}-${clip.cropArea.width}-${clip.cropArea.height}`
    : "no-crop";

  const moveableKey =
    media.type === "text"
      ? `${clip.id}-${clip.text}`
      : `${clip.id}-${cropKey}-${width}-${height}`;

  return (
    <Moveable
      key={moveableKey}
      target={document.getElementById(`element-${clip.id}`)}
      draggable={true}
      resizable={true}
      scalable={false}
      rotatable={true}
      snappable={true}
      origin={false}
      rotationPosition="bottom"
      keepRatio={!isText}
      renderDirections={
        isText ? ["e", "se"] : ["nw", "n", "ne", "w", "e", "sw", "s", "se"]
      }
      edge={false}
      throttleResize={0}
      throttleRotate={0}
      throttleScale={0}
      throttleDrag={0}
      zoom={zoom}
      className={isText ? "moveable-control-text" : "moveable-control-media"}
      style={
        {
          "--moveable-color": "#ffffff",
          "--moveable-control-bg": "#ffffff",
        } as React.CSSProperties
      }
      onDrag={handleDragEvent}
      onDragStart={handleDragStartEvent}
      onDragEnd={handleDragEndEvent}
      onResize={handleResizeEvent}
      onResizeEnd={handleResizeEndEvent}
      onScale={handleScaleEvent}
      onScaleEnd={handleScaleEndEvent}
      onRotate={handleRotateEvent}
      onRotateEnd={handleRotateEndEvent}
    />
  );
};

export const MoveableControl = React.memo(MoveableControlComponent);
