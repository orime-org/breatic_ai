import React, { useEffect, useRef, useState } from "react";
import { LoadingOutlined } from "@ant-design/icons";
import { MediaItem, TimelineClip } from "../types";

interface MediaElementProps {
  clip: TimelineClip;
  media: MediaItem;
  canvasSize: { width: number; height: number };
  selectedClipId?: string | null;
  isEditingRef: React.RefObject<Set<string>>;
  textRefs: React.RefObject<{ [key: string]: HTMLDivElement }>;
  videoRefs: React.RefObject<{ [key: string]: HTMLVideoElement }>;
  onClipSelect?: (id: string | null) => void;
  onClipUpdate?: (
    id: string,
    updates: Partial<TimelineClip>,
    options?: { skipHistory?: boolean; immediate?: boolean }
  ) => void;
  isFullscreenMode?: boolean; // 是否为全屏预览模式
}

const MediaElementComponent: React.FC<MediaElementProps> = ({
  clip,
  media,
  canvasSize,
  selectedClipId,
  isEditingRef,
  textRefs,
  videoRefs,
  onClipSelect,
  onClipUpdate,
  isFullscreenMode = false,
}) => {
  if (!media || !media.type) {
    // 如果 media 不存在，根据 clip 信息创建默认文本媒体项
    media = {
      id: clip.mediaId,
      name: clip.mediaId,
      text: clip.text || "Text",
      type: "text",
      url: "",
    };
  }
  const isText = media.type === "text";
  const textElementRef = useRef<HTMLDivElement | null>(null);

  // 图片/视频加载状态
  const [isLoading, setIsLoading] = useState(
    media.type === "image" || media.type === "video"
  );

  // 当媒体 URL 变化时，重新触发加载状态（用于数据回显）
  useEffect(() => {
    if (media.type === "image" || media.type === "video") {
      setIsLoading(true);
    }
  }, [media.url, media.type]);

  // 当选中状态改变时，清除焦点和文本选中
  useEffect(() => {
    if (media.type === "text" && textElementRef.current) {
      // 如果当前片段不再被选中，清除焦点和文本选中状态
      if (selectedClipId !== clip.id) {
        // 如果该元素当前有焦点，移除焦点
        if (document.activeElement === textElementRef.current) {
          textElementRef.current.blur();
        }

        // 清除文本选中状态
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          // 检查选中范围是否在当前文本元素内
          if (textElementRef.current.contains(range.commonAncestorContainer)) {
            selection.removeAllRanges();
          }
        }
      }
    }
  }, [selectedClipId, clip.id, media.type]);

  // 当文字内容变化时，更新 DOM（用于撤销/重做）
  useEffect(() => {
    console.log(
      `🔍 useEffect 触发 - clip.id: ${clip.id}, clip.text: "${clip.text}"`
    );

    if (media.type === "text") {
      const textElement = textRefs.current?.[clip.id];
      console.log(`  textElement 存在: ${!!textElement}`);

      if (textElement) {
        const isEditing = isEditingRef.current?.has(clip.id);
        const currentText = textElement.innerText || "";
        const newText = clip.text || "Text";

        console.log(
          `  isEditing: ${isEditing}, currentText: "${currentText}", newText: "${newText}"`
        );

        // 只在不处于编辑状态时更新
        if (!isEditing && currentText !== newText) {
          textElement.innerText = newText;
          console.log(`  ✅ PreviewCanvas 文字已更新`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.text, clip.id, media.type]);

  // 当文字内容变化时，如果文本框还没有设置过宽高（首次创建），自动计算初始宽高
  useEffect(() => {
    if (media.type === "text" && onClipUpdate) {
      const textElement = textRefs.current?.[clip.id];
      const parent = textElement?.parentElement as HTMLDivElement;

      // 只有在宽高未设置时才自动计算（首次创建文本时）
      const hasManualSize =
        clip.width !== undefined && clip.height !== undefined;

      if (
        textElement &&
        parent &&
        !isEditingRef.current?.has(clip.id) &&
        !hasManualSize
      ) {
        // 临时设置宽高为 auto 以获取实际内容尺寸
        const originalWidth = parent.style.width;
        const originalHeight = parent.style.height;
        parent.style.width = "auto";
        parent.style.height = "auto";

        // 获取实际内容宽高（添加一些内边距）
        const newWidth = Math.max(parent.offsetWidth + 20, 120);
        const newHeight = Math.max(parent.offsetHeight, 40);

        // 恢复原始尺寸样式
        parent.style.width = originalWidth;
        parent.style.height = originalHeight;

        // 设置初始宽高
        onClipUpdate(
          clip.id,
          {
            width: newWidth,
            height: newHeight,
          },
          {
            skipHistory: true,
            immediate: true,
          }
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.text, clip.id, media.type]);

  // 追踪上一次的字号和尺寸，用于判断变化来源
  const prevStateRef = useRef({
    fontSize: clip.textStyle?.fontSize,
    width: clip.width,
    height: clip.height,
  });

  // 当通过右侧面板修改字号时，通过缩放比例调整控制框大小
  useEffect(() => {
    if (media.type === "text" && onClipUpdate && clip.textStyle?.fontSize) {
      const prevState = prevStateRef.current;
      const currentFontSize = clip.textStyle.fontSize;
      const currentWidth = clip.width;
      const currentHeight = clip.height;

      // 检查是否只有字号变化了（宽高没有同时变化）
      // 如果宽高也同时变化了，说明是通过缩放控制框改变的，不需要再次调整
      const onlyFontSizeChanged =
        prevState.fontSize !== undefined &&
        currentFontSize !== prevState.fontSize &&
        currentWidth === prevState.width &&
        currentHeight === prevState.height;

      if (onlyFontSizeChanged && prevState.fontSize) {
        // 计算字号的缩放比例
        const fontScaleRatio = currentFontSize / prevState.fontSize;

        // 获取当前的宽高（如果没有设置则使用默认值）
        const oldWidth = currentWidth || 300;
        const oldHeight = currentHeight || 80;

        // 根据字号缩放比例，同比例缩放控制框
        const newWidth = Math.round(oldWidth * fontScaleRatio);
        const newHeight = Math.round(oldHeight * fontScaleRatio);

        // 更新控制框大小
        onClipUpdate(
          clip.id,
          {
            width: newWidth,
            height: newHeight,
          },
          {
            skipHistory: false,
          }
        );

        // 更新追踪状态
        prevStateRef.current = {
          fontSize: currentFontSize,
          width: newWidth,
          height: newHeight,
        };
      } else {
        // 更新追踪状态（即使不调整，也要更新状态）
        prevStateRef.current = {
          fontSize: currentFontSize,
          width: currentWidth,
          height: currentHeight,
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.textStyle?.fontSize, clip.width, clip.height, clip.id, media.type]);

  // 根据素材原始比例计算默认尺寸
  let defaultWidth: number | "auto" = "auto";
  let defaultHeight: number | "auto" = "auto";

  if (!isText && media.width && media.height) {
    const mediaRatio = media.width / media.height;
    const maxWidth = canvasSize.width * 0.8;
    const maxHeight = canvasSize.height * 0.8;

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
    defaultWidth = canvasSize.width * 0.8;
    defaultHeight = canvasSize.height * 0.8;
  }

  const defaultTextWidth = 300; // 增加默认宽度以适配字号48
  const defaultTextHeight = 80; // 增加默认高度以适配字号48

  const defaultX = isText
    ? canvasSize.width / 2 - defaultTextWidth / 2
    : (canvasSize.width - (defaultWidth as number)) / 2;
  const defaultY = isText
    ? canvasSize.height / 2 - defaultTextHeight / 2
    : (canvasSize.height - (defaultHeight as number)) / 2;

  const x = clip.x ?? defaultX;
  const y = clip.y ?? defaultY;
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
      : 40);
  const scale = clip.scale ?? 1;
  const rotation = clip.rotation ?? 0;
  const opacity = clip.opacity ?? 100;

  // 生成文字样式
  const generateTextStyle = () => {
    const textStyle = clip.textStyle || {};
    const fontSize = textStyle.fontSize ?? 48; // 默认字号48
    const fontFamily = textStyle.fontFamily || "Arial";

    const style: React.CSSProperties = {
      fontFamily: fontFamily,
      fontSize: `${fontSize}px`,
      lineHeight: 1.6, // 行高为字号的1.6倍（相对值，会随字号和缩放自动调整）
      color: textStyle.color || "#ffffff",
      textAlign: (textStyle.textAlign as any) || "center",
      textDecoration: textStyle.textDecoration || "none",
      textTransform: (textStyle.textTransform as any) || "none",
      opacity: opacity / 100,
    };

    // 字体描边
    if (textStyle.strokeColor && textStyle.strokeWidth) {
      style.WebkitTextStroke = `${textStyle.strokeWidth}px ${textStyle.strokeColor}`;
      (
        style as any
      ).textStroke = `${textStyle.strokeWidth}px ${textStyle.strokeColor}`;
    }

    // 字体阴影
    if (textStyle.shadowColor) {
      const shadowX = textStyle.shadowOffsetX || 0;
      const shadowY = textStyle.shadowOffsetY || 0;
      const shadowBlur = textStyle.shadowBlur || 0;
      style.textShadow = `${shadowX}px ${shadowY}px ${shadowBlur}px ${textStyle.shadowColor}`;
    }

    return style;
  };

  // 生成外层容器样式（应用到最外层 div）- 包含圆角、轮廓和阴影
  const generateOuterContainerStyle = () => {
    const mediaStyle = clip.mediaStyle || {};
    const style: React.CSSProperties = {};

    // 圆角
    if (mediaStyle.borderRadius) {
      style.borderRadius = `${mediaStyle.borderRadius}px`;
    }

    // 轮廓
    if (mediaStyle.outlineColor && mediaStyle.outlineWidth) {
      style.outline = `${mediaStyle.outlineWidth}px solid ${mediaStyle.outlineColor}`;
    }

    // 阴影
    if (mediaStyle.shadowColor) {
      const shadowX = mediaStyle.shadowOffsetX || 0;
      const shadowY = mediaStyle.shadowOffsetY || 0;
      const shadowBlur = mediaStyle.shadowBlur || 0;
      style.boxShadow = `${shadowX}px ${shadowY}px ${shadowBlur}px ${mediaStyle.shadowColor}`;
    }

    return style;
  };

  // 生成媒体样式（应用到内层 div）- 只包含透明度和滤镜
  const generateMediaStyle = () => {
    const mediaStyle = clip.mediaStyle || {};
    const style: React.CSSProperties = {
      opacity: opacity / 100,
    };

    // 模糊和亮度（使用CSS滤镜）
    const filters = [];
    if (mediaStyle.blur && mediaStyle.blur > 0) {
      filters.push(`blur(${mediaStyle.blur}px)`);
    }
    if (mediaStyle.brightness && mediaStyle.brightness !== 100) {
      filters.push(`brightness(${mediaStyle.brightness}%)`);
    }
    if (filters.length > 0) {
      style.filter = filters.join(" ");
    }

    return style;
  };

  // 生成裁剪样式（用于图片和视频）
  const generateCropStyle = () => {
    if (clip.cropArea && media.width && media.height) {
      const {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      } = clip.cropArea;

      // 计算缩放比例：将裁剪区域缩放到当前元素尺寸
      // 分别计算 X 和 Y 方向的缩放，以支持改变宽高比
      const scaleX = width / cropWidth;
      const scaleY = height / cropHeight;

      // 计算媒体元素的显示尺寸（原始尺寸 × 缩放比例）
      const displayWidth = media.width * scaleX;
      const displayHeight = media.height * scaleY;

      // 计算偏移量：将裁剪区域移动到容器的左上角
      const offsetX = -cropX * scaleX;
      const offsetY = -cropY * scaleY;

      console.log(`🎬 [${media.type}] 裁剪样式计算:`, {
        媒体ID: media.id,
        媒体尺寸: { width: media.width, height: media.height },
        裁剪区域: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
        元素尺寸: { width, height },
        缩放比例: { scaleX, scaleY },
        显示尺寸: { width: displayWidth, height: displayHeight },
        偏移: { x: offsetX, y: offsetY },
      });

      return {
        position: "absolute" as const,
        left: `${offsetX}px`,
        top: `${offsetY}px`,
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        display: "block",
        pointerEvents: "none" as const,
      };
    } else {
      return {
        width: "100%",
        height: "100%",
        objectFit: "contain" as const,
        display: "block",
      };
    }
  };

  // 判断是否需要 overflow: hidden（裁剪或圆角时需要）
  const needsOverflowHidden =
    !isText && (clip.cropArea || clip.mediaStyle?.borderRadius);

  return (
    <div
      id={`element-${clip.id}`}
      className="absolute"
      style={{
        transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
        width: `${width}px`,
        height: `${height}px`,
        transformOrigin: "center center",
        cursor: isFullscreenMode ? "default" : "move",
        zIndex: 100 - clip.trackIndex,
        overflow: needsOverflowHidden ? "hidden" : "visible",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
        WebkitPerspective: 1000,
        perspective: 1000,
        willChange: "transform",
        ...generateOuterContainerStyle(),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClipSelect?.(clip.id);
      }}
    >
      {media.type === "video" && (
        <>
          {/* Loading 背景 */}
          {isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                backgroundColor: "#E5E5E5",
                zIndex: 1,
              }}
            >
              <LoadingOutlined style={{ fontSize: 32, color: "#999" }} />
            </div>
          )}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{
              ...generateMediaStyle(),
              ...(clip.cropArea ? generateCropStyle() : {}),
              opacity: isLoading ? 0 : opacity / 100,
            }}
          >
            <video
              ref={(el) => {
                if (el) {
                  videoRefs.current[clip.id] = el;
                  // 设置音量，如果未定义则使用100（满音量）
                  const volume = clip.volume !== undefined ? clip.volume : 100;
                  // HTMLMediaElement.volume 必须在 [0, 1] 范围内，所以需要限制最大值为 1
                  el.volume = Math.min(volume / 100, 1);
                  // 根据音量设置静音状态
                  el.muted = volume === 0;
                }
              }}
              src={media.url}
              crossOrigin="anonymous"
              style={{
                width: "100%",
                height: "100%",
                objectFit: clip.cropArea ? "fill" : "contain",
                display: "block",
              }}
              playsInline
              preload="auto"
              onLoadedData={() => setIsLoading(false)}
            />
          </div>
        </>
      )}
      {media.type === "image" && (
        <>
          {/* Loading 背景 */}
          {isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                backgroundColor: "#E5E5E5",
                zIndex: 1,
              }}
            >
              <LoadingOutlined style={{ fontSize: 32, color: "#999" }} />
            </div>
          )}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{
              ...generateMediaStyle(),
              ...(clip.cropArea ? generateCropStyle() : {}),
              opacity: isLoading ? 0 : opacity / 100,
            }}
          >
            <img
              src={media.url}
              alt={media.name}
              crossOrigin="anonymous"
              style={
                {
                  width: "100%",
                  height: "100%",
                  objectFit: clip.cropArea ? "fill" : "contain",
                  display: "block",
                  imageRendering: "auto",
                  WebkitBackfaceVisibility: "hidden",
                  backfaceVisibility: "hidden",
                  transform: "translateZ(0)",
                } as React.CSSProperties
              }
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </>
      )}
      {media.type === "text" && (
        <div
          style={{
            width: "100%",
            minHeight: "100%", // 改为 minHeight，允许高度自动扩展
            display: "table",
          }}
        >
          <div
            style={{
              display: "table-cell",
              verticalAlign: "middle",
            }}
          >
            <div
              ref={(el) => {
                if (el) {
                  textRefs.current[clip.id] = el;
                  textElementRef.current = el;
                  if (
                    !isEditingRef.current?.has(clip.id) &&
                    el.innerText !== clip.text
                  ) {
                    el.innerText = clip.text || "Text";
                  }
                }
              }}
              contentEditable={selectedClipId === clip.id}
              className="outline-none pointer-events-auto cursor-text nodrag"
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minWidth: "50px",
                userSelect: selectedClipId === clip.id ? "text" : "none",
                width: "100%",
                boxSizing: "border-box",
                ...generateTextStyle(),
              }}
              onFocus={() => {
                isEditingRef.current?.add(clip.id);
              }}
              onInput={(e) => {
                if (onClipUpdate) {
                  const target = e.currentTarget as HTMLDivElement; // contentEditable div
                  const tableCell = target.parentElement as HTMLDivElement; // table-cell
                  const tableDiv = tableCell?.parentElement as HTMLDivElement; // table
                  const outerContainer =
                    tableDiv?.parentElement as HTMLDivElement; // 最外层容器

                  if (!outerContainer) return;

                  // 临时设置最外层容器高度为 auto 以获取实际内容高度
                  const originalHeight = outerContainer.style.height;
                  outerContainer.style.height = "auto";

                  // 获取实际内容高度，最小高度根据字号动态计算
                  const fontSize = clip.textStyle?.fontSize ?? 48;
                  const minHeight = Math.max(fontSize * 1.5, 60); // 最小高度为字号的1.5倍，至少60px
                  const actualHeight = outerContainer.offsetHeight;
                  const contentHeight = Math.max(actualHeight, minHeight);

                  // 恢复原始高度样式
                  outerContainer.style.height = originalHeight;

                  // ✅ 真正的自适应：高度 = 内容高度（文字多就高，文字少就低）
                  const newHeight = contentHeight;

                  // 使用 innerText 获取文本（保留换行符为 \n）
                  const newText = target.innerText || "";
                  console.log("📝 [输入] 文本更新:", {
                    原始文本: newText,
                    换行符数量: (newText.match(/\n/g) || []).length,
                    文本长度: newText.length,
                    当前控制框高度: clip.height,
                    实际内容高度: actualHeight,
                    最小高度: minHeight,
                    计算后内容高度: contentHeight,
                    新高度: newHeight,
                  });

                  // 只更新文字和高度，不改变宽度，跳过历史记录保存
                  onClipUpdate(
                    clip.id,
                    {
                      text: newText,
                      height: newHeight,
                    },
                    { skipHistory: true }
                  ); // 输入过程中不保存历史记录
                }
              }}
              onBlur={(e) => {
                isEditingRef.current?.delete(clip.id);
                if (onClipUpdate) {
                  const target = e.currentTarget as HTMLDivElement; // contentEditable div
                  const tableCell = target.parentElement as HTMLDivElement; // table-cell
                  const tableDiv = tableCell?.parentElement as HTMLDivElement; // table
                  const outerContainer =
                    tableDiv?.parentElement as HTMLDivElement; // 最外层容器

                  if (!outerContainer) return;

                  // 临时设置最外层容器高度为 auto 以获取实际内容高度
                  const originalHeight = outerContainer.style.height;
                  outerContainer.style.height = "auto";

                  // 获取实际内容高度，最小高度根据字号动态计算
                  const fontSize = clip.textStyle?.fontSize ?? 48;
                  const minHeight = Math.max(fontSize * 1.5, 60); // 最小高度为字号的1.5倍，至少60px
                  const actualHeight = outerContainer.offsetHeight;
                  const contentHeight = Math.max(actualHeight, minHeight);

                  // 恢复原始高度样式
                  outerContainer.style.height = originalHeight;

                  // ✅ 真正的自适应：高度 = 内容高度（文字多就高，文字少就低）
                  const newHeight = contentHeight;

                  // 使用 innerText 获取文本（保留换行符为 \n）
                  const newText = target.innerText || "";
                  console.log("📝 [失焦] 文本保存:", {
                    原始文本: newText,
                    换行符数量: (newText.match(/\n/g) || []).length,
                    文本长度: newText.length,
                    当前控制框高度: clip.height,
                    实际内容高度: actualHeight,
                    最小高度: minHeight,
                    计算后内容高度: contentHeight,
                    新高度: newHeight,
                  });

                  // 只更新文字和高度，不改变宽度，失焦时立即保存历史记录
                  onClipUpdate(
                    clip.id,
                    {
                      text: newText,
                      height: newHeight,
                    },
                    { skipHistory: false, immediate: true }
                  ); // 编辑结束时立即保存历史记录
                }
              }}
              onClick={(e) => {
                if (selectedClipId === clip.id) {
                  e.stopPropagation();
                }
              }}
              onDoubleClick={(e) => {
                if (selectedClipId === clip.id) {
                  e.stopPropagation();
                  const target = e.currentTarget as HTMLDivElement;
                  target.focus();
                  const range = document.createRange();
                  range.selectNodeContents(target);
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }
              }}
              onMouseDown={(e) => {
                if (selectedClipId === clip.id) {
                  e.stopPropagation();
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const MediaElement = React.memo(MediaElementComponent);
