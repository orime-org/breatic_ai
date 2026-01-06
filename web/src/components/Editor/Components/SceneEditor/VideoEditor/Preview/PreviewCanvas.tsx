import React, { useRef, useEffect, useState } from "react";
import { MediaItem, TimelineClip } from "../types";
import { MediaElement } from "./MediaElement";
import { MoveableControl } from "./MoveableControl";
import ZoomPanWrapper from "./ZoomPanWrapper";
import { getBaseCanvasSize } from "../utils/canvasCoordinates";

interface PreviewCanvasProps {
  currentTime: number;
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  isPlaying: boolean;
  canvasRatio?: string;
  selectedClipId?: string | null;
  onClipUpdate?: (id: string, updates: Partial<TimelineClip>) => void;
  onClipSelect?: (id: string | null) => void;
  forceUpdateTextRef?: { current: (() => void) | null };
  isFullscreen?: boolean; // 是否为全屏模式
}

const PreviewCanvasComponent: React.FC<PreviewCanvasProps> = ({
  currentTime,
  clips,
  mediaItems,
  isPlaying,
  canvasRatio = "16:9",
  selectedClipId,
  onClipUpdate,
  onClipSelect,
  forceUpdateTextRef,
  isFullscreen = false,
}) => {
  console.log("🎬 [PreviewCanvas] 组件渲染", {
    isFullscreen,
    currentTime,
    clipsCount: clips.length,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoomPanKey, setZoomPanKey] = useState(0);
  const [initialCanvasSize, setInitialCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // 画布选中状态

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const textRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const isEditingRef = useRef<Set<string>>(new Set());

  // 监控 clips 变化
  useEffect(() => {
    console.log("🎨 [PreviewCanvas] clips 状态更新:", {
      clips数量: clips.length,
      clipIds: clips.map((c) => c.id),
    });
  }, [clips]);

  // 提供给父组件的强制更新文字函数
  useEffect(() => {
    if (forceUpdateTextRef) {
      forceUpdateTextRef.current = () => {
        console.log("🔄 强制更新所有文字");
        // 清除编辑状态
        isEditingRef.current.forEach((clipId) => {
          const textElement = textRefs.current[clipId];
          if (textElement && document.activeElement === textElement) {
            textElement.blur();
          }
        });
        isEditingRef.current.clear();

        // 强制更新所有文字内容
        clips.forEach((clip) => {
          if (clip.text !== undefined && textRefs.current[clip.id]) {
            const textElement = textRefs.current[clip.id];
            textElement.textContent = clip.text || "Text";
            console.log(`  📝 强制更新文字: ${clip.id} -> "${clip.text}"`);
          }
        });
      };
    }
  }, [clips, forceUpdateTextRef]);

  // 使用 ResizeObserver 持续监听容器大小变化
  useEffect(() => {
    console.log("📏 [PreviewCanvas] 设置 ResizeObserver", {
      hasContainer: !!containerRef.current,
      isFullscreen,
    });

    if (!containerRef.current) return;

    // 立即获取初始尺寸
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      console.log("📏 [PreviewCanvas] 容器尺寸更新:", {
        width: rect.width,
        height: rect.height,
        isFullscreen,
      });
      setContainerSize({ width: rect.width, height: rect.height });
    };

    // 立即执行一次
    updateSize();

    // 创建 ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log("📏 [PreviewCanvas] ResizeObserver 检测到尺寸变化:", {
          width,
          height,
          isFullscreen,
        });
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    // 清理函数
    return () => {
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在挂载时设置一次，ResizeObserver 会持续监听

  // 监听全屏状态变化，强制重新挂载 ZoomPanWrapper（仅非全屏模式需要）
  useEffect(() => {
    // 只在退出全屏时重新挂载 ZoomPanWrapper，进入全屏时不需要
    if (!isFullscreen) {
      console.log("🖥️ [PreviewCanvas] 退出全屏，重新挂载 ZoomPanWrapper");
      setZoomPanKey((prev) => prev + 1);
    }
  }, [isFullscreen]);

  // 监听画布比例变化，重置初始尺寸
  useEffect(() => {
    console.log("📐 [PreviewCanvas] canvasRatio 变化，重置初始尺寸", {
      canvasRatio,
      isFullscreen,
    });
    // 画布比例变化时，重置初始尺寸以便重新计算
    if (!isFullscreen) {
      setInitialCanvasSize(null);
      // 强制 ZoomPanWrapper 重新挂载以触发居中
      setZoomPanKey((prev) => prev + 1);
      console.log(
        "🔄 [PreviewCanvas] 画布比例变化，触发 ZoomPanWrapper 重新挂载"
      );
    }
  }, [canvasRatio, isFullscreen]);

  // 根据比例和容器大小计算画布大小，保持20px安全距离
  const getCanvasSize = () => {
    console.log("📐 [PreviewCanvas] getCanvasSize 调用", {
      containerSize,
      isFullscreen,
      canvasRatio,
      initialCanvasSize,
    });

    // 主界面模式：使用初始计算的固定尺寸
    if (!isFullscreen && initialCanvasSize) {
      console.log("📏 [PreviewCanvas] 使用初始固定尺寸:", initialCanvasSize);
      return initialCanvasSize;
    }

    if (!containerSize.width || !containerSize.height) {
      console.warn("⚠️ [PreviewCanvas] 容器大小为 0，返回空画布");
      return { width: 0, height: 0 };
    }

    let ratio: number;
    switch (canvasRatio) {
      case "16:9":
        ratio = 16 / 9;
        break;
      case "9:16":
        ratio = 9 / 16;
        break;
      case "1:1":
        ratio = 1;
        break;
      default:
        ratio = 16 / 9;
    }

    // 全屏模式下不需要安全距离，否则减去80px安全距离（上下左右各40px）
    const padding = isFullscreen ? 0 : 80;
    const availableWidth = containerSize.width - padding;
    const availableHeight = containerSize.height - padding;

    // 根据容器大小和比例计算画布大小（始终保持画布比例）
    const containerRatio = availableWidth / availableHeight;
    let canvasWidth, canvasHeight;

    if (containerRatio > ratio) {
      // 容器更宽，以高度为准
      canvasHeight = availableHeight;
      canvasWidth = canvasHeight * ratio;
    } else {
      // 容器更高，以宽度为准
      canvasWidth = availableWidth;
      canvasHeight = canvasWidth / ratio;
    }

    const calculatedSize = { width: canvasWidth, height: canvasHeight };

    console.log("📏 [PreviewCanvas] 画布尺寸计算结果:", {
      isFullscreen,
      容器大小: containerSize,
      padding,
      可用空间: { width: availableWidth, height: availableHeight },
      画布大小: {
        width: Math.round(canvasWidth),
        height: Math.round(canvasHeight),
      },
      比例: canvasRatio,
    });

    // 如果是主界面首次计算，保存为初始尺寸
    if (!isFullscreen && !initialCanvasSize) {
      console.log("💾 [PreviewCanvas] 保存初始画布尺寸:", calculatedSize);
      setInitialCanvasSize(calculatedSize);
    }

    return calculatedSize;
  };

  const canvasSize = getCanvasSize();

  // 根据画布比例获取虚拟坐标系统尺寸
  const baseCanvasSize = getBaseCanvasSize(canvasRatio);

  // 获取当前时间点应该显示的所有片段
  const getActiveClips = () => {
    return clips.filter(
      (clip) => currentTime >= clip.start && currentTime < clip.end
    );
  };

  const activeClips = getActiveClips();

  // 调试：记录 clips 变化
  useEffect(() => {
    console.log("🎬 [PreviewCanvas] clips 变化", {
      totalClips: clips.length,
      activeClips: activeClips.length,
      clipIds: clips.map((c) => c.id).join(", "),
    });
  }, [clips, activeClips.length]);

  // 清理无效的 refs（当片段被删除时）
  useEffect(() => {
    const validClipIds = new Set(clips.map((c) => c.id));

    // 清理无效的视频引用
    Object.keys(videoRefs.current).forEach((clipId) => {
      if (!validClipIds.has(clipId)) {
        delete videoRefs.current[clipId];
        console.log(`🗑️ 清理无效的视频引用: ${clipId}`);
      }
    });

    // 清理无效的音频引用
    Object.keys(audioRefs.current).forEach((clipId) => {
      if (!validClipIds.has(clipId)) {
        delete audioRefs.current[clipId];
        console.log(`🗑️ 清理无效的音频引用: ${clipId}`);
      }
    });

    // 清理无效的文字引用
    Object.keys(textRefs.current).forEach((clipId) => {
      if (!validClipIds.has(clipId)) {
        delete textRefs.current[clipId];
        console.log(`🗑️ 清理无效的文字引用: ${clipId}`);
      }
    });
  }, [clips]);

  // 调试日志
  console.log("PreviewCanvas render:", {
    canvasSize,
    containerSize,
    canvasRatio,
    activeClipsCount: activeClips.length,
    selectedClipId,
  });

  // 计算时间映射：播放头被限制，需要映射到完整时间范围
  const calculateMappedTime = (currentTime: number, clips: TimelineClip[]) => {
    const maxClipEnd =
      clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
    const playheadWidthTime = 2 / 100; // 播放头宽度对应的时间（约0.02秒）
    const limitedMax = maxClipEnd - playheadWidthTime;

    // 将受限的 currentTime [0, limitedMax] 映射到 [0, maxClipEnd]
    const timeScale = limitedMax > 0 ? maxClipEnd / limitedMax : 1;
    return currentTime * timeScale;
  };

  // 处理视频同步
  const syncVideo = (
    clip: TimelineClip,
    media: MediaItem,
    mappedCurrentTime: number,
    isPlaying: boolean,
    isFullscreen: boolean
  ) => {
    const videoElement = videoRefs.current[clip.id];
    if (!videoElement) return;

    const timelineTime = mappedCurrentTime - clip.start;
    const clipDuration = clip.end - clip.start;

    const trimStart = clip.trimStart || 0;
    const clipDurationForTrim = clip.end - clip.start;
    const trimEnd =
      clip.trimEnd ||
      (media.duration ? media.duration : trimStart + clipDurationForTrim);

    // 全屏模式下：静音视频（只用于画面同步，音频由主画布播放）
    if (isFullscreen) {
      videoElement.volume = 0;
      videoElement.muted = true;
    } else {
      // 恢复视频音量（由 MediaElement 设置的音量）
      const volume = clip.volume !== undefined ? clip.volume : 100;
      videoElement.volume = Math.min(volume / 100, 1);
      videoElement.muted = volume === 0;
    }

    if (timelineTime >= 0 && timelineTime <= clipDuration) {
      const videoTime = trimStart + timelineTime;
      const clampedVideoTime = Math.min(
        Math.max(trimStart, videoTime),
        trimEnd
      );

      videoElement.playbackRate = 1.0;

      // 只有在视频加载了足够的元数据后才设置 currentTime
      if (
        videoElement.readyState >= 1 &&
        Math.abs(videoElement.currentTime - clampedVideoTime) > 0.1
      ) {
        videoElement.currentTime = clampedVideoTime;
      }
    }

    if (isPlaying && timelineTime >= 0 && timelineTime <= clipDuration) {
      // 只有在视频准备好后才播放
      if (videoElement.readyState >= 1) {
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            console.log("Video autoplay was prevented");
          });
        }
      }
    } else {
      videoElement.pause();
    }
  };

  // 处理音频同步
  const syncAudio = (
    clip: TimelineClip,
    media: MediaItem,
    mappedCurrentTime: number,
    isPlaying: boolean,
    isFullscreen: boolean
  ) => {
    const audioElement = audioRefs.current[clip.id];
    if (!audioElement) return;

    const timelineTime = mappedCurrentTime - clip.start;
    const clipDuration = clip.end - clip.start;

    const trimStart = clip.trimStart || 0;
    const clipDurationForTrim = clip.end - clip.start;
    const trimEnd =
      clip.trimEnd ||
      (media.duration ? media.duration : trimStart + clipDurationForTrim);
    const audioSpeed = clip.speed || 1;
    const audioVolume = clip.volume ?? 100;

    // 设置播放速度
    audioElement.playbackRate = audioSpeed;
    if (isFullscreen) {
      audioElement.volume = 0; // 静音
      audioElement.pause(); // 暂停播放
    } else {
      audioElement.volume = Math.min(Math.max(audioVolume / 200, 0), 1);
    }

    if (timelineTime >= 0 && timelineTime <= clipDuration) {
      // 计算音频时间：时间轴时间乘以速度
      const audioTime = trimStart + timelineTime * audioSpeed;
      const clampedAudioTime = Math.min(
        Math.max(trimStart, audioTime),
        trimEnd
      );

      // 只有在音频加载了足够的元数据后才设置 currentTime
      if (
        audioElement.readyState >= 1 &&
        Math.abs(audioElement.currentTime - clampedAudioTime) > 0.1
      ) {
        audioElement.currentTime = clampedAudioTime;
      }
    }

    // 全屏模式下不播放音频
    if (
      !isFullscreen &&
      isPlaying &&
      timelineTime >= 0 &&
      timelineTime <= clipDuration
    ) {
      // 只有在音频准备好后才播放
      if (audioElement.readyState >= 1) {
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            console.log("Audio autoplay was prevented");
          });
        }
      }
    } else if (!isFullscreen) {
      audioElement.pause();
    }
  };

  // 视频和音频同步逻辑
  useEffect(() => {
    const mappedCurrentTime = calculateMappedTime(currentTime, clips);

    activeClips.forEach((clip) => {
      const media = mediaItems.find((item) => item.id === clip.mediaId);
      if (!media) return;

      if (media.type === "video") {
        syncVideo(clip, media, mappedCurrentTime, isPlaying, isFullscreen);
      } else if (media.type === "audio") {
        syncAudio(clip, media, mappedCurrentTime, isPlaying, isFullscreen);
      }
    });
  }, [currentTime, isPlaying, activeClips, mediaItems, clips, isFullscreen]);

  return (
    <>
      <style>
        {`
          /* 控制框边框 */
          .moveable-control .moveable-control-box {
            border: 2px solid #4F46E5 !important;
          }
          
          /* 边线 */
          .moveable-control .moveable-line {
            background-color: #4F46E5 !important;
          }
          
          /* 控制点基础样式 */
          .moveable-control .moveable-direction {
            width: 10px !important;
            height: 10px !important;
            background-color: #ffffff !important;
            border: 2px solid #4F46E5 !important;
            border-radius: 50% !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
          }
          
          /* 旋转控制点 */
          .moveable-control .moveable-rotation {
            width: 24px !important;
            height: 24px !important;
            background-color: #ffffff !important;
            border: 2px solid #4F46E5 !important;
            border-radius: 50% !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
            cursor: grab !important;
          }
          
          .moveable-control .moveable-rotation:hover {
            background-color: #4F46E5 !important;
            transform: scale(1.1) !important;
            transition: all 0.2s ease !important;
          }
          
          /* 控制点悬停效果 */
          .moveable-control .moveable-direction:hover {
            background-color: #4F46E5 !important;
            transform: scale(1.2) !important;
            transition: all 0.2s ease !important;
          }
          
          /* 文字控制框的右中控制点变成长方形 */
          .moveable-control-text .moveable-direction.moveable-e {
            width: 10px !important;
            height: 20px !important;
            border-radius: 5px !important;
            margin-left: -5px !important;
            margin-top: -10px !important;
          }
          
          /* 媒体控制框的角控制点放大 */
          .moveable-control-media .moveable-direction.moveable-nw,
          .moveable-control-media .moveable-direction.moveable-ne,
          .moveable-control-media .moveable-direction.moveable-sw,
          .moveable-control-media .moveable-direction.moveable-se {
            width: 12px !important;
            height: 12px !important;
          }
        `}
      </style>
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
        style={{ backgroundColor: isFullscreen ? "#262626" : "#F5F5F5" }}
      >
        {/* 可缩放移动的整个画布区域 */}
        <ZoomPanWrapper
          key={zoomPanKey}
          disabled={isFullscreen}
          minScale={0.1}
          maxScale={5}
          initialScale={1}
          canvasRatio={canvasRatio}
          onTransformChange={(transform) => {
            console.log("Transform changed:", transform);
          }}
          onClick={() => {
            // 全屏模式下不支持选中操作
            if (!isFullscreen) {
              // 点击画布背景（非拖动）时取消选中
              console.log("🖱️ 点击画布背景，取消选中");
              onClipSelect?.(null);
            }
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <div
              className="relative"
              style={{
                width: canvasSize.width > 0 ? `${canvasSize.width}px` : "100%",
                height:
                  canvasSize.height > 0 ? `${canvasSize.height}px` : "100%",
                minWidth: "100px",
                minHeight: "100px",
              }}
            >
              {/* 黑色画布背景 */}
              <div
                id="preview-canvas-bg"
                data-width={canvasSize.width}
                data-height={canvasSize.height}
                className="absolute bg-black"
                style={{
                  width: `${canvasSize.width}px`,
                  height: `${canvasSize.height}px`,
                  zIndex: -1,
                }}
              />

              {/* 画布外层容器：实际显示尺寸 */}
              <div
                className="relative overflow-hidden"
                style={{
                  width: `${canvasSize.width}px`,
                  height: `${canvasSize.height}px`,
                }}
              >
                {/* 画布内容层：虚拟坐标系统，通过 scale 等比缩放到实际尺寸 */}
                <div
                  ref={canvasRef}
                  id="preview-canvas"
                  className="relative"
                  style={{
                    width: `${baseCanvasSize.width}px`,
                    height: `${baseCanvasSize.height}px`,
                    transform: `scale(${canvasSize.width / baseCanvasSize.width
                      })`,
                    transformOrigin: "top left",
                  }}
                >
                  {/* 音频元素：不显示但需要播放声音 */}
                  {activeClips
                    .filter((clip) => {
                      const media = mediaItems.find(
                        (item) => item.id === clip.mediaId
                      );
                      return media?.type === "audio";
                    })
                    .map((clip) => {
                      const media = mediaItems.find(
                        (item) => item.id === clip.mediaId
                      );
                      if (!media) return null;

                      return (
                        <audio
                          key={clip.id}
                          ref={(el) => {
                            if (el) {
                              audioRefs.current[clip.id] = el;
                              // 全屏模式下静音
                              if (isFullscreen) {
                                el.volume = 0;
                              } else {
                                // 应用音频样式
                                if (clip.volume !== undefined) {
                                  el.volume = Math.min(Math.max(clip.volume / 200, 0), 1);
                                }
                              }
                              if (clip.speed !== undefined) {
                                el.playbackRate = clip.speed;
                              }
                            }
                          }}
                          src={media.url}
                          style={{ display: "none" }}
                        />
                      );
                    })}

                  {/* 视觉元素：按轨道顺序显示 */}
                  {activeClips
                    .sort((a, b) => b.trackIndex - a.trackIndex)
                    .map((clip) => {
                      const media = mediaItems.find(
                        (item) => item.id === clip.mediaId
                      ) || {} as MediaItem;
                      if (media?.type === "audio") return null;

                      return (
                        <React.Fragment key={clip.id}>
                          <MediaElement
                            clip={clip}
                            media={media}
                            canvasSize={baseCanvasSize}
                            selectedClipId={
                              isFullscreen ? null : selectedClipId
                            }
                            isEditingRef={isEditingRef}
                            textRefs={textRefs}
                            videoRefs={videoRefs}
                            onClipSelect={onClipSelect}
                            onClipUpdate={onClipUpdate}
                            isFullscreenMode={isFullscreen}
                          />
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* Moveable 控制框 - 现在也在可缩放区域内，全屏模式下不显示 */}
                {!isFullscreen &&
                  activeClips
                    .filter((clip) => {
                      const media = mediaItems.find(
                        (item) => item.id === clip.mediaId
                      );
                      return (
                        media?.type !== "audio" &&
                        selectedClipId === clip.id
                      );
                    })
                    .map((clip) => {
                      let media = mediaItems.find(
                        (item) => item.id === clip.mediaId
                      );
                      if (!media || !media.type) media = {id: clip.mediaId, name: clip.mediaId, text: clip.text || 'Text', type: "text", url: ""};

                      // 生成包含裁剪信息和尺寸的 key，确保裁剪后 MoveableControl 重新挂载
                      const cropKey = clip.cropArea
                        ? `crop-${clip.cropArea.x}-${clip.cropArea.y}-${clip.cropArea.width}-${clip.cropArea.height}`
                        : "no-crop";
                      const moveableKey = `${clip.id}-${cropKey}-${clip.width}-${clip.height}`;

                      return (
                        <MoveableControl
                          key={moveableKey}
                          clip={clip}
                          media={media}
                          canvasSize={baseCanvasSize}
                          onClipUpdate={onClipUpdate}
                        />
                      );
                    })}
              </div>
              {/* 关闭画布内容层 */}
            </div>
            {/* 关闭画布外层容器 */}
          </div>
        </ZoomPanWrapper>
      </div>
    </>
  );
};

// 自定义比较函数，确保 clips 变化时重新渲染
const arePropsEqual = (
  prevProps: PreviewCanvasProps,
  nextProps: PreviewCanvasProps
) => {
  // clips 数组引用或长度变化时，必须重新渲染
  const clipsChanged =
    prevProps.clips !== nextProps.clips ||
    prevProps.clips.length !== nextProps.clips.length;

  if (clipsChanged) {
    console.log("🔄 [PreviewCanvas] clips 变化，强制重新渲染", {
      prevLength: prevProps.clips.length,
      nextLength: nextProps.clips.length,
      相同引用: prevProps.clips === nextProps.clips,
    });
    return false; // 需要重新渲染
  }

  // 其他 props 比较
  return (
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.canvasRatio === nextProps.canvasRatio &&
    prevProps.selectedClipId === nextProps.selectedClipId &&
    prevProps.mediaItems === nextProps.mediaItems &&
    prevProps.isFullscreen === nextProps.isFullscreen
  );
};

export const PreviewCanvas = React.memo(PreviewCanvasComponent, arePropsEqual);
