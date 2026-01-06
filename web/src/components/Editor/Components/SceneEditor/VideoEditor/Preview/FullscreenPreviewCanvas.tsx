import React, { useRef, useEffect, useState } from "react";
import { MediaItem, TimelineClip } from "../types";
import { MediaElement } from "./MediaElement";

interface FullscreenPreviewCanvasProps {
  currentTime: number;
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  isPlaying: boolean;
  canvasRatio?: string;
}

const FullscreenPreviewCanvasComponent: React.FC<
  FullscreenPreviewCanvasProps
> = ({ currentTime, clips, mediaItems, isPlaying, canvasRatio = "16:9" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const textRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const isEditingRef = useRef<Set<string>>(new Set());

  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    // 初始化
    updateSize();

    // 监听窗口大小变化
    window.addEventListener("resize", updateSize);

    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // 根据比例和容器大小计算画布大小
  const getCanvasSize = () => {
    if (!containerSize.width || !containerSize.height) {
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

    // 全屏模式不需要安全距离
    const availableWidth = containerSize.width;
    const availableHeight = containerSize.height;

    // 根据容器大小和比例计算画布大小
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

    return { width: canvasWidth, height: canvasHeight };
  };

  const canvasSize = getCanvasSize();

  // 获取当前时间点应该显示的所有片段
  const getActiveClips = () => {
    return clips.filter(
      (clip) => currentTime >= clip.start && currentTime < clip.end
    );
  };

  const activeClips = getActiveClips();

  // 清理无效的 refs
  useEffect(() => {
    const validClipIds = new Set(clips.map((c) => c.id));

    Object.keys(videoRefs.current).forEach((clipId) => {
      if (!validClipIds.has(clipId)) {
        delete videoRefs.current[clipId];
      }
    });

    Object.keys(audioRefs.current).forEach((clipId) => {
      if (!validClipIds.has(clipId)) {
        delete audioRefs.current[clipId];
      }
    });

    Object.keys(textRefs.current).forEach((clipId) => {
      if (!validClipIds.has(clipId)) {
        delete textRefs.current[clipId];
      }
    });
  }, [clips]);

  // 视频和音频同步逻辑
  useEffect(() => {
    const maxClipEnd =
      clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
    const playheadWidthTime = 2 / 100;
    const limitedMax = maxClipEnd - playheadWidthTime;

    const timeScale = limitedMax > 0 ? maxClipEnd / limitedMax : 1;
    const mappedCurrentTime = currentTime * timeScale;

    activeClips.forEach((clip) => {
      const media = mediaItems.find((item) => item.id === clip.mediaId);

      // 视频处理
      if (media && media.type === "video") {
        const videoElement = videoRefs.current[clip.id];
        if (videoElement) {
          const timelineTime = mappedCurrentTime - clip.start;
          const clipDuration = clip.end - clip.start;

          const trimStart = clip.trimStart || 0;
          const clipDurationForTrim = clip.end - clip.start;
          const trimEnd =
            clip.trimEnd ||
            (media.duration ? media.duration : trimStart + clipDurationForTrim);

          if (timelineTime >= 0 && timelineTime <= clipDuration) {
            const videoTime = trimStart + timelineTime;
            const clampedVideoTime = Math.min(
              Math.max(trimStart, videoTime),
              trimEnd
            );

            videoElement.playbackRate = 1.0;

            if (Math.abs(videoElement.currentTime - clampedVideoTime) > 0.1) {
              videoElement.currentTime = clampedVideoTime;
            }
          }

          if (isPlaying && timelineTime >= 0 && timelineTime <= clipDuration) {
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {});
            }
          } else {
            videoElement.pause();
          }
        }
      }

      // 音频处理
      if (media && media.type === "audio") {
        const audioElement = audioRefs.current[clip.id];
        if (audioElement) {
          const timelineTime = mappedCurrentTime - clip.start;
          const clipDuration = clip.end - clip.start;

          const trimStart = clip.trimStart || 0;
          const clipDurationForTrim = clip.end - clip.start;
          const trimEnd =
            clip.trimEnd ||
            (media.duration ? media.duration : trimStart + clipDurationForTrim);
          const audioSpeed = clip.speed || 1;
          const audioVolume = clip.volume ?? 100;

          audioElement.playbackRate = audioSpeed;
          audioElement.volume = Math.min(Math.max(audioVolume / 200, 0), 1);

          if (timelineTime >= 0 && timelineTime <= clipDuration) {
            // 计算音频时间：时间轴时间乘以速度
            // 例如：时间轴播放 2 秒，速度 2x，音频应该播放到 trimStart + 4 秒
            const audioTime = trimStart + timelineTime * audioSpeed;
            const clampedAudioTime = Math.min(
              Math.max(trimStart, audioTime),
              trimEnd
            );

            if (Math.abs(audioElement.currentTime - clampedAudioTime) > 0.1) {
              audioElement.currentTime = clampedAudioTime;
            }
          }

          if (isPlaying && timelineTime >= 0 && timelineTime <= clipDuration) {
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {});
            }
          } else {
            audioElement.pause();
          }
        }
      }
    });
  }, [currentTime, isPlaying, activeClips, mediaItems, clips]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full overflow-hidden"
      style={{ backgroundColor: "#262626" }}
    >
      <div className="flex items-center justify-center w-full h-full">
        <div
          className="relative"
          style={{
            width: canvasSize.width > 0 ? `${canvasSize.width}px` : "100%",
            height: canvasSize.height > 0 ? `${canvasSize.height}px` : "100%",
            minWidth: "100px",
            minHeight: "100px",
            backgroundColor: "#000",
          }}
        >
          {/* 黑色画布背景 */}
          <div
            className="absolute bg-black"
            style={{
              width: "100%",
              height: "100%",
              zIndex: -1,
            }}
          />

          {/* 画布外层容器 */}
          <div
            className="relative overflow-hidden"
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
            }}
          >
            {/* 画布内容层：固定 1920x1080，通过 scale 缩放到实际尺寸 */}
            <div
              ref={canvasRef}
              className="relative"
              style={{
                width: "1920px",
                height: "1080px",
                transform: `scale(${canvasSize.width / 1920})`,
                transformOrigin: "top left",
              }}
            >
              {/* 音频元素 */}
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
                          if (clip.volume !== undefined) {
                            el.volume = Math.min(Math.max(clip.volume / 200, 0), 1);
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
                  );
                  if (!media || media.type === "audio") return null;

                  return (
                    <MediaElement
                      key={clip.id}
                      clip={clip}
                      media={media}
                      canvasSize={{ width: 1920, height: 1080 }}
                      selectedClipId={null}
                      isEditingRef={isEditingRef}
                      textRefs={textRefs}
                      videoRefs={videoRefs}
                      onClipSelect={() => {}}
                      onClipUpdate={() => {}}
                      isFullscreenMode={true}
                    />
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FullscreenPreviewCanvas = React.memo(
  FullscreenPreviewCanvasComponent
);
