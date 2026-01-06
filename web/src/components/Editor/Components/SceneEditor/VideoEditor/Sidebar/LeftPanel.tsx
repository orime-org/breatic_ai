import React from "react";
import { useTranslation } from "react-i18next";
import { MediaUploader } from "./MediaUploader";
import { MediaLibrary } from "./MediaLibrary";
import { MediaItem, TimelineClip } from "../types";
import { Button } from "antd";
import { ThinScrollbar } from "../utils/Scrollbar";
import { smoothScrollToTop } from "../../../../Utils/smoothScrollToTop";

interface LeftPanelProps {
  activePanel: string | null;
  mediaItems: MediaItem[];
  onMediaAdd: (item: MediaItem) => void;
  onMediaRemove: (id: string) => void;
  onAddToTimeline: (clip: TimelineClip) => void;
  onMediaAndClipAdd: (media: MediaItem, clip: TimelineClip) => void;
  existingClips: TimelineClip[];
  currentTime: number;
  nodeId: string;
  isSyncing?: boolean; // 是否正在同步
}

// 添加文本到时间轴的工具函数（导出供其他组件使用）
export const createTextClip = (text: string, mediaItems: MediaItem[], onAddToTimeline: (clip: TimelineClip) => void, startTime: number = 0) => {
  // 查找已存在的文字素材，或使用默认ID
  const existingTextMedia = mediaItems.find((item) => item.type === "text");
  const textMediaId = existingTextMedia?.id || "default-text-media";

  // 获取画布尺寸（基准尺寸1920x1080）
  const canvasWidth = 1920;
  const canvasHeight = 1080;
  const textWidth = 300;
  const textHeight = 80;

  // 创建文本片段
  const textClip: TimelineClip = {
    id: `clip-${Date.now()}-${Math.random()}`,
    mediaId: textMediaId,
    type: "text", // 添加类型字段
    start: startTime,
    end: startTime + 5,
    trackIndex: 0,
    text: text,
    width: textWidth,
    height: textHeight,
    x: (canvasWidth - textWidth) / 2,
    y: (canvasHeight - textHeight) / 2,
    textStyle: {
      fontSize: 48,
      fontFamily: "Arial",
      color: "#FFFFFF",
      textAlign: "center",
    },
  };

  // 只添加片段到时间轴，不添加素材到素材库
  onAddToTimeline(textClip);
};

const LeftPanelComponent: React.FC<LeftPanelProps> = ({ activePanel, mediaItems, onMediaAdd, onMediaRemove, onAddToTimeline, onMediaAndClipAdd, existingClips, currentTime, nodeId, isSyncing = false }) => {
  const { t } = useTranslation();

  // 上传状态管理
  const [uploadingCounts, setUploadingCounts] = React.useState<{ video: number; audio: number; image: number }>({
    video: 0,
    audio: 0,
    image: 0,
  });

  const isUploading = Object.values(uploadingCounts).reduce((a, b) => a + b, 0) > 0;

  // 综合加载状态
  const isLoading = isSyncing || isUploading;
  const isLoadingVideo = isSyncing || uploadingCounts.video > 0;
  const isLoadingImage = isSyncing || uploadingCounts.image > 0;
  const isLoadingAudio = isSyncing || uploadingCounts.audio > 0;

  const scrollbarRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (scrollbarRef.current) {
      smoothScrollToTop(scrollbarRef.current);
    }
  }, [isLoading, mediaItems]);

  const handleUploadStart = React.useCallback((type?: "video" | "audio" | "image") => {
    if (type) {
      setUploadingCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    }
  }, []);

  const handleUploadEnd = React.useCallback((type?: "video" | "audio" | "image") => {
    if (type) {
      setUploadingCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
    }
  }, []);

  if (!activePanel) return null;

  const renderContent = () => {
    switch (activePanel) {
      case "folder":
        // 按类型分组素材
        const folderTextItems = mediaItems.filter((item) => item.type === "text");
        const imageItems = mediaItems.filter((item) => item.type === "image");
        const audioItems = mediaItems.filter((item) => item.type === "audio");
        const videoItems = mediaItems.filter((item) => item.type === "video");

        return (
          <div className="flex flex-col h-full">
            <div style={{ padding: "10px" }} className="border-b">
              <MediaUploader onMediaAdd={onMediaAdd} uploadType="folder" nodeId={nodeId} onUploadStart={handleUploadStart} onUploadEnd={handleUploadEnd} />
            </div>
            <ThinScrollbar className="flex-1" ref={scrollbarRef}>
              {/* 正在加载且没有任何媒体时，显示骨架屏 */}
              {isLoading && mediaItems.length === 0 && (
                <div className="p-2">
                  <MediaLibrary
                    mediaItems={[]}
                    onMediaRemove={onMediaRemove}
                    onAddToTimeline={onAddToTimeline}
                    existingClips={existingClips}
                    useScrollbar={false}
                    currentTime={currentTime}
                    isLoading={isLoadingImage || isLoadingVideo}
                    mediaType={isLoadingVideo ? "video" : "image"}
                    loadingCount={isLoadingVideo ? uploadingCounts.video : uploadingCounts.image}
                  />
                </div>
              )}

              {/* 文字分组 */}
              <div style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    paddingLeft: "10px",
                    paddingRight: "10px",
                    paddingTop: "10px",
                    marginBottom: "10px",
                    fontSize: "12px",
                  }}
                  className="font-semibold text-gray-700"
                >
                  {t("mediaLibrary.textSection")}
                </div>
                <div style={{ paddingLeft: "10px", paddingRight: "10px" }}>
                  <Button
                    block
                    style={{
                      height: "26px",
                      fontSize: "12px",
                      borderRadius: "4px",
                    }}
                    onClick={() => createTextClip("Text", mediaItems, onAddToTimeline, currentTime)}
                  >
                    {t("mediaLibrary.addText")}
                  </Button>
                </div>
                {folderTextItems.length > 0 && <MediaLibrary mediaItems={folderTextItems} onMediaRemove={onMediaRemove} onAddToTimeline={onAddToTimeline} existingClips={existingClips} useScrollbar={false} currentTime={currentTime} mediaType="text" />}
              </div>
              {/* 图片分组 */}
              {(imageItems.length > 0 || isLoadingImage) && (
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      marginBottom: "10px",
                      fontSize: "12px",
                    }}
                    className="font-semibold text-gray-700"
                  >
                    {t("mediaLibrary.imageSection")} ({imageItems.length})
                  </div>
                  <MediaLibrary mediaItems={imageItems} onMediaRemove={onMediaRemove} onAddToTimeline={onAddToTimeline} existingClips={existingClips} useScrollbar={false} currentTime={currentTime} isLoading={isLoadingImage} mediaType="image" loadingCount={uploadingCounts.image} />
                </div>
              )}

              {/* 音频分组 */}
              {(audioItems.length > 0 || isLoadingAudio) && (
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      marginBottom: "10px",
                      fontSize: "12px",
                    }}
                    className="font-semibold text-gray-700"
                  >
                    {t("mediaLibrary.audioSection")} ({audioItems.length})
                  </div>
                  <MediaLibrary mediaItems={audioItems} onMediaRemove={onMediaRemove} onAddToTimeline={onAddToTimeline} existingClips={existingClips} useScrollbar={false} currentTime={currentTime} isLoading={isLoadingAudio} mediaType="audio" loadingCount={uploadingCounts.audio} />
                </div>
              )}

              {/* 视频分组 */}
              {(videoItems.length > 0 || isLoadingVideo) && (
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      paddingLeft: "10px",
                      paddingRight: "10px",
                      marginBottom: "10px",
                      fontSize: "12px",
                    }}
                    className="font-semibold text-gray-700"
                  >
                    {t("mediaLibrary.videoSection")} ({videoItems.length})
                  </div>
                  <div>
                    <MediaLibrary mediaItems={videoItems} onMediaRemove={onMediaRemove} onAddToTimeline={onAddToTimeline} existingClips={existingClips} useScrollbar={false} currentTime={currentTime} isLoading={isLoadingVideo} mediaType="video" loadingCount={uploadingCounts.video} />
                  </div>
                </div>
              )}

              {/* 空状态 */}
              {!isLoading && mediaItems.length === 0 && (
                <div style={{ padding: "10px 10px 20px 10px" }} className="text-center text-gray-400">
                  <p style={{ fontSize: "12px" }}>{t("mediaLibrary.noMedia")}</p>
                  <p style={{ marginTop: "10px" }} className="text-xs">
                    {t("mediaLibrary.uploadPrompt")}
                  </p>
                </div>
              )}
            </ThinScrollbar>
          </div>
        );
      case "text":
        // 获取文字模板
        const textItems = mediaItems.filter((item) => item.type === "text");
        console.log("📝 文字面板 - textItems:", textItems);
        return (
          <div className="flex flex-col h-full">
            <div style={{ padding: "10px 10px 0 10px" }}>
              <div style={{ marginBottom: "10px", fontSize: "12px" }} className="font-semibold">
                {t("toolbar.text")}
              </div>
              <Button
                block
                style={{
                  height: "26px",
                  fontSize: "12px",
                  borderRadius: "4px",
                }}
                onClick={() => createTextClip("Text", mediaItems, onAddToTimeline, currentTime)}
              >
                {t("mediaLibrary.addText")}
              </Button>
            </div>
            {textItems.length > 0 && (
              <div className="flex-1">
                <MediaLibrary mediaItems={textItems} onMediaRemove={onMediaRemove} onAddToTimeline={onAddToTimeline} existingClips={existingClips} currentTime={currentTime} mediaType="text" />
              </div>
            )}
          </div>
        );
      case "videos":
      case "audio":
      case "images":
        return (
          <div className="flex flex-col h-full">
            <div style={{ padding: "10px" }} className="border-b">
              <div style={{ marginBottom: "10px", fontSize: "12px" }} className="font-semibold">
                {activePanel === "videos" ? t("toolbar.video") : activePanel === "audio" ? t("toolbar.audio") : t("toolbar.image")}
              </div>
              <MediaUploader onMediaAdd={onMediaAdd} uploadType={activePanel === "videos" ? "video" : activePanel === "audio" ? "audio" : "image"} nodeId={nodeId} onUploadStart={handleUploadStart} onUploadEnd={handleUploadEnd} />
            </div>
            <MediaLibrary
              mediaItems={mediaItems.filter((item) => {
                if (activePanel === "videos") return item.type === "video";
                if (activePanel === "audio") return item.type === "audio";
                if (activePanel === "images") return item.type === "image";
                return true;
              })}
              onMediaRemove={onMediaRemove}
              onAddToTimeline={onAddToTimeline}
              existingClips={existingClips}
              currentTime={currentTime}
              isLoading={activePanel === "videos" ? isLoadingVideo : activePanel === "images" ? isLoadingImage : activePanel === "audio" ? isLoadingAudio : isLoading}
              mediaType={activePanel === "videos" ? "video" : activePanel === "images" ? "image" : activePanel === "audio" ? "audio" : undefined}
              loadingCount={activePanel === "videos" ? uploadingCounts.video : activePanel === "images" ? uploadingCounts.image : activePanel === "audio" ? uploadingCounts.audio : undefined}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col bg-white border-r border-gray-300 overflow-y-auto nowheel nodrag"
      data-nodrag="true"
      data-nopan="true"
      style={{ width: "240px", overscrollBehavior: "contain", pointerEvents: "auto" }}
      onWheelCapture={(e: React.WheelEvent<HTMLDivElement>) => {
        if (e.ctrlKey || e.metaKey) {
          // 拦截组合键缩放
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onWheel={(e: React.WheelEvent<HTMLDivElement>) => {
        if (e.ctrlKey || e.metaKey) {
          // 拦截组合键缩放
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {renderContent()}
    </div>
  );
};

export const LeftPanel = React.memo(LeftPanelComponent);
