import React, { useEffect, useRef, useState } from "react";
import { Tooltip, Skeleton } from "antd";
import { useTranslation } from "react-i18next";
import { VideoCameraOutlined, FileImageOutlined, FileTextOutlined, LoadingOutlined } from "@ant-design/icons";
import { EditorNodes_UploadingSpinAnimation_SVG } from "../../../../SvgLoader/staticIcon";
import { MediaItem, TimelineClip } from "../types";
import { ThinScrollbar } from "../utils/Scrollbar";
import { createTextClip } from "./LeftPanel";
import { smoothScrollToTop } from "../../../../Utils/smoothScrollToTop";

interface MediaLibraryProps {
  mediaItems: MediaItem[];
  onMediaRemove: (id: string) => void;
  onAddToTimeline: (clip: TimelineClip) => void;
  existingClips?: TimelineClip[];
  useScrollbar?: boolean; // 是否使用ThinScrollbar
  currentTime?: number; // 当前播放头位置
  isLoading?: boolean; // 是否加载中
  mediaType?: "image" | "video" | "audio" | "text"; // 媒体类型，用于控制骨架屏显示
  loadingCount?: number; // 加载中的文件数量（用于骨架屏个数）
}

// 骨架屏卡片组件
const SkeletonCard = ({ mediaType }: { mediaType?: "image" | "video" | "audio" | "text" }) => (
  <div className="w-full rounded border border-gray-100 overflow-hidden">
    <div className="w-full bg-[#F3F3F3]" style={{ aspectRatio: "16/9", minHeight: "148px" }}>
      {mediaType === "image" && (
        <Skeleton.Image
          active={true}
          className="skeleton-no-radius inset-0 w-full h-full object-contain rounded-0 select-none"
          style={{
            aspectRatio: "16/9",
          }}
        />
      )}
      {mediaType === "video" && (
        <Skeleton.Node
          active={true}
          className="skeleton-no-radius inset-0 w-full h-full object-contain rounded-0 select-none"
          style={{
            aspectRatio: "16/9",
          }}
        >
          <VideoCameraOutlined style={{ fontSize: 40, color: "#bfbfbf" }} />
        </Skeleton.Node>
      )}
    </div>
    {/* <div className="px-[10px] py-[5px] space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
    </div> */}
  </div>
);

/**
 * 格式化时长（秒）为 "HH:MM:SS" 统一时间格式。
 *
 * 使用场景：
 * - 音频、视频播放时长显示
 * - 统一 UI 的时间呈现格式（始终补齐为两位）
 * - 支持传入浮点秒、小数秒、异常值、负数等情况
 *
 * 特点：
 * - 自动向下取整（Math.floor），秒数不做四舍五入
 * - 异常输入（NaN / Infinity / 负数）会被重置为 0
 * - 始终返回固定三段格式：00:00:00
 *
 * @param seconds 以秒为单位的时间，可以是小数或任意数字
 * @returns 形如 "00:00:00" 的字符串
 *
 * 使用示例：
 *   formatDuration(5.8)          // "00:00:05"
 *   formatDuration(75)           // "00:01:15"
 *   formatDuration(3605)         // "01:00:05"
 *   formatDuration(-10)          // "00:00:00"
 *   formatDuration(NaN)          // "00:00:00"
 */
const formatDuration = (seconds: number): string => {
  // 输入兜底：负数、NaN、Infinity 一律重置为 0
  if (!isFinite(seconds) || seconds < 0) seconds = 0;

  // 向下取整，只保留整数秒
  const total = Math.floor(seconds);

  // 计算 “小时 / 分钟 / 秒”
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  // 每段统一补零为两位，例如 4 → "04"
  return [h.toString().padStart(2, "0"), m.toString().padStart(2, "0"), s.toString().padStart(2, "0")].join(":");
};

const MediaLibraryComponent: React.FC<MediaLibraryProps> = ({ mediaItems, onMediaRemove, onAddToTimeline, existingClips = [], useScrollbar = true, currentTime = 0, isLoading = false, mediaType, loadingCount = 1 }) => {
  const { t } = useTranslation();
  const resultListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultListRef.current) {
      smoothScrollToTop(resultListRef.current);
    }
  }, [isLoading, mediaItems]);

  // 管理每个媒体项的加载状态（使用媒体ID作为key）
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // 处理添加到时间轴
  const handleAddToTimeline = (media: MediaItem) => {
    // 文本类型使用专门的函数
    if (media.type === "text") {
      createTextClip(media.text || "Text", mediaItems, onAddToTimeline, currentTime);
      return;
    }

    // 创建片段基础信息
    const mediaDuration = media.duration || 5;
    const clip: any = {
      id: `clip-${Date.now()}-${Math.random()}`,
      mediaId: media.id,
      type: media.type, // 添加类型字段
      start: currentTime,
      end: currentTime + mediaDuration,
      trackIndex: 0,
      trimStart: 0,
      trimEnd: mediaDuration,
    };

    // 图片或视频：计算初始尺寸和位置
    if ((media.type === "image" || media.type === "video") && media.width && media.height) {
      const CANVAS_WIDTH = 1920;
      const CANVAS_HEIGHT = 1080;
      const targetWidth = CANVAS_WIDTH * 0.5;
      const targetHeight = CANVAS_HEIGHT * 0.5;
      const mediaRatio = media.width / media.height;
      const targetRatio = targetWidth / targetHeight;

      // 保持宽高比
      if (mediaRatio > targetRatio) {
        clip.width = targetWidth;
        clip.height = targetWidth / mediaRatio;
      } else {
        clip.height = targetHeight;
        clip.width = targetHeight * mediaRatio;
      }

      // 居中位置
      clip.x = (CANVAS_WIDTH - clip.width) / 2;
      clip.y = (CANVAS_HEIGHT - clip.height) / 2;
    }

    onAddToTimeline(clip);
  };

  // 渲染媒体项图标
  const renderIcon = (type: string) => {
    const iconMap = {
      video: <VideoCameraOutlined className="text-lg text-blue-500" />,
      audio: <img src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/music.png")} alt="music" className="w-3.5 h-3.5" />,
      image: <FileImageOutlined className="text-lg text-purple-500" />,
      text: <FileTextOutlined className="text-lg text-purple-600" />,
    };
    return iconMap[type as keyof typeof iconMap] || null;
  };

  // 设置媒体项的加载状态
  const setMediaLoading = (mediaId: string, isLoading: boolean) => {
    setLoadingStates((prev) => ({
      ...prev,
      [mediaId]: isLoading,
    }));
  };

  // 获取媒体项的加载状态（默认为true表示加载中）
  const isMediaLoading = (mediaId: string, mediaType: string): boolean => {
    // 只有图片和视频需要加载状态
    if (mediaType !== "image" && mediaType !== "video") {
      return false;
    }
    // 如果状态未初始化，默认为加载中
    return loadingStates[mediaId] !== false;
  };

  // 渲染媒体项预览内容
  const renderMediaPreview = (item: MediaItem) => {
    const previewHeight = item.type === "audio" ? "" : item.type === "text" ? "h-full" : "aspect-video";

    const isLoading = isMediaLoading(item.id, item.type);

    return (
      <div className={`relative bg-gray-100 ${previewHeight}`} style={item.type === "image" || item.type === "video" ? { minHeight: "100px" } : undefined}>
        {/* Loading 背景 - 只在图片和视频加载时显示 */}
        {isLoading && (item.type === "image" || item.type === "video") && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundColor: "#E5E5E5",
              zIndex: 1,
            }}
          >
            <LoadingOutlined style={{ fontSize: 24, color: "#999" }} />
          </div>
        )}

        {/* 视频预览 */}
        {item.type === "video" && (
          <img src={item.thumbnail || item.url} alt={item.name} className="object-contain w-full h-full" style={{ aspectRatio: "16 / 9", objectPosition: "center", backgroundColor: "#fff" }} onLoad={() => setMediaLoading(item.id, false)} onError={() => setMediaLoading(item.id, false)} />
        )}

        {/* 图片预览 */}
        {item.type === "image" && (
          <img src={item.thumbnail ?? item.url} alt={item.name} className="object-contain w-full h-full" style={{ aspectRatio: "16 / 9", objectPosition: "center", backgroundColor: "#fff" }} onLoad={() => setMediaLoading(item.id, false)} onError={() => setMediaLoading(item.id, false)} />
        )}

        {/* 音频预览 */}
        {item.type === "audio" && (
          <div className="flex items-center w-full bg-white" style={{ height: "40px" }}>
            <div
              className="flex items-center justify-center text-xl text-gray-600 shrink-0"
              style={{
                backgroundColor: "#F4F4F5",
                width: "40px",
                height: "40px",
              }}
            >
              {renderIcon(item.type)}
            </div>
            <div
              className="flex-1 min-w-0 font-medium text-gray-700"
              style={{
                fontSize: "12px",
                paddingLeft: "10px",
                paddingRight: "10px",
              }}
            >
              <div className="truncate" title={item.name}>
                {item.name}
              </div>
            </div>
          </div>
        )}

        {/* 文字预览 */}
        {item.type === "text" && (
          <div className="flex items-center w-full h-full bg-gray-50">
            <div className="text-left text-gray-700 line-clamp-1" style={{ fontSize: "12px", padding: "10px" }}>
              {item.text || ""}
            </div>
          </div>
        )}

        {/* 时长标签 */}
        {item.duration && <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-2 py-0.5 rounded">{formatDuration(item.duration)}</div>}
      </div>
    );
  };

  const content = (
    <div style={{ padding: "10px" }}>
      {/* 加载状态显示骨架屏 */}
      {isLoading && (mediaType === "image" || mediaType === "video") && (
        <div className="flex flex-col gap-[10px] mb-[10px]">
          {Array.from({ length: Math.max(1, loadingCount) }).map((_, idx) => (
            <SkeletonCard key={idx} mediaType={mediaType} />
          ))}
        </div>
      )}

      {mediaItems.length === 0 && !isLoading ? (
        <div style={{ padding: "10px 10px 20px 10px" }} className="text-center text-gray-400">
          <p style={{ fontSize: "12px" }}>{t("mediaLibrary.noMedia")}</p>
          <p style={{ marginTop: "10px" }} className="text-xs">
            {t("mediaLibrary.uploadPrompt")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mediaItems.map((item) => {
            const itemHeight = item.type === "text" ? "" : "";
            const itemStyle = item.type === "text" ? { height: "26px" } : {};

            return (
              <div key={item.id} className={`relative overflow-hidden transition-all border border-gray-200 cursor-pointer group hover:border-blue-400 w-full ${itemHeight}`} style={{ ...itemStyle, borderRadius: "4px" }} onClick={() => handleAddToTimeline(item)}>
                {renderMediaPreview(item)}

                {/* 文件名（音频和文字已在卡片内显示，不重复显示） */}
                {item.type !== "audio" && item.type !== "text" && (
                  <div style={{ padding: "5px 10px" }}>
                    <Tooltip title={item.name || ""}>
                      <p className="text-xs text-gray-700 truncate">{item.name || ""}</p>
                    </Tooltip>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return useScrollbar ? <ThinScrollbar ref={resultListRef}>{content}</ThinScrollbar> : <div className="h-full">{content}</div>;
};

export const MediaLibrary = React.memo(MediaLibraryComponent);
