import React, { useEffect, useRef, useMemo } from "react";
import { Slider, Divider } from "antd";
import { CaretRightOutlined, PauseOutlined, FullscreenExitOutlined, CloseOutlined } from "@ant-design/icons";
import { PreviewCanvas } from "./PreviewCanvas";
import { MediaItem, TimelineClip } from "../types";

interface FullscreenPreviewProps {
  visible: boolean;
  currentTime: number;
  clips: TimelineClip[];
  mediaItems: MediaItem[];
  isPlaying: boolean;
  canvasRatio: string;
  onClose: () => void;
  onPlayPause: () => void;
  onTimeChange: (time: number) => void;
}

export const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({ visible, currentTime, clips, mediaItems, isPlaying, canvasRatio, onClose, onPlayPause, onTimeChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算总时长
  const duration = useMemo(() => {
    return clips.length > 0 ? Math.max(...clips.map((c) => c.end)) : 0;
  }, [clips]);

  // 处理关闭全屏：先退出浏览器全屏，然后关闭组件
  const handleClose = async () => {
    console.log("🔙 [FullscreenPreview] 用户点击关闭按钮");

    if (document.fullscreenElement) {
      console.log("🖥️ [FullscreenPreview] 正在退出浏览器全屏...");
      try {
        await document.exitFullscreen();
        console.log("✅ [FullscreenPreview] 已退出浏览器全屏");
      } catch (error) {
        console.error("❌ [FullscreenPreview] 退出全屏失败:", error);
      }
    }

    // 退出全屏后，fullscreenchange 事件会自动调用 onClose
    // 但如果不在全屏状态，直接调用 onClose
    if (!document.fullscreenElement) {
      console.log("🔙 [FullscreenPreview] 直接调用 onClose");
      onClose();
    }
  };

  // 进入和退出浏览器全屏
  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const enterFullscreen = async () => {
      try {
        // 检查是否已经在全屏状态
        if (document.fullscreenElement) {
          console.log("🖥️ [FullscreenPreview] 已经在全屏状态，跳过");
          return;
        }

        // 直接请求进入全屏，不暂停播放（因为全屏和主画布现在是独立的）
        console.log("🖥️ [FullscreenPreview] 请求进入全屏");
        await containerRef.current?.requestFullscreen();
        console.log("✅ [FullscreenPreview] 已进入全屏");
      } catch (error) {
        console.error("❌ [FullscreenPreview] 进入全屏失败:", error);
        onClose(); // 如果全屏失败，关闭组件
      }
    };

    // 使用 requestAnimationFrame 确保 DOM 已经渲染
    requestAnimationFrame(() => {
      enterFullscreen();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]); // 只依赖 visible，避免不必要的重新执行

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      console.log("🔄 [FullscreenPreview] fullscreenchange 事件触发，全屏状态:", !!document.fullscreenElement);

      if (!document.fullscreenElement && visible) {
        // 退出了全屏状态
        console.log("🔙 [FullscreenPreview] 退出全屏，关闭组件");
        onClose();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [visible, onClose]);

  // 计算当前时间格式 - 支持帧显示（假设30fps）
  const formatTime = (seconds: number) => {
    const totalFrames = Math.floor(seconds * 30);
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = totalFrames % 30;

    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  };

  // 当不可见时，不渲染组件，避免内部 PreviewCanvas 产生副作用
  if (!visible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed  inset-0 z-[9999] flex flex-col w-full h-full overflow-hidden"
      style={{
        backgroundColor: "#262626",
        // display: visible ? "flex" : "none", // 通过 display 控制显示/隐藏，而不是卸载组件
      }}
    >
      <style>
        {`
          .fullscreen-controls-slider .ant-slider-rail {
            background-color: rgba(100, 100, 100, 0.4) !important;
            height: 4px !important;
          }
          .fullscreen-controls-slider .ant-slider-track {
            background-color: #22d3ee !important;
            height: 4px !important;
          }
          .fullscreen-controls-slider .ant-slider-handle::after {
            background-color: #22d3ee !important;
            border: 2px solid #22d3ee !important;
            box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.2) !important;
            width: 12px !important;
            height: 12px !important;
          }
          .fullscreen-controls-slider:hover .ant-slider-track {
            background-color: #06b6d4 !important;
          }
          .fullscreen-controls-slider:hover .ant-slider-handle::after {
            box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.3) !important;
          }
        `}
      </style>
      <div className="relative w-full h-full overflow-hidden">
        {/* 顶部右侧关闭按钮 */}
        <div className="absolute top-0 right-0 z-50 p-6">
          <CloseOutlined className="text-sm text-white transition-colors cursor-pointer hover:text-cyan-400" onClick={handleClose} title="关闭" />
        </div>

        {/* PreviewCanvas - 占满整个屏幕，全屏模式 */}
        <div className="absolute inset-0 w-full h-full">
          <PreviewCanvas currentTime={currentTime} clips={clips} mediaItems={mediaItems} isPlaying={isPlaying} canvasRatio={canvasRatio} isFullscreen={true} />
        </div>

        {/* 底部播放控制栏 - 绝对定位浮动在底部 */}
        <div className="absolute bottom-0 left-0 right-0 z-50 flex justify-center px-8 pb-6">
          <div
            className="flex items-center gap-4 px-6"
            style={{
              borderRadius: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              border: "1px solid #6b7280",
              maxWidth: "960px",
              width: "100%",
              height: "50px",
            }}
          >
            {/* 播放/暂停按钮 */}
            <div className="flex items-center justify-center flex-shrink-0 transition-all cursor-pointer hover:scale-110" onClick={onPlayPause}>
              {isPlaying ? <PauseOutlined className="text-sm text-white" /> : <CaretRightOutlined className="text-sm text-white" />}
            </div>

            {/* 时间显示 */}
            <div className="flex items-center flex-shrink-0 gap-2 font-mono text-white" style={{ fontSize: "14px" }}>
              <span className="text-cyan-400" style={{ color: "#2073B1" }}>
                {formatTime(currentTime)}
              </span>
              <span className="text-gray-400">/</span>
              <span className="text-white">{formatTime(duration)}</span>
            </div>

            {/* 进度条 */}
            <div className="flex-1 pl-4">
              <Slider min={0} max={duration} step={0.01} value={currentTime} onChange={onTimeChange} tooltip={{ formatter: (value) => formatTime(value || 0) }} className="fullscreen-controls-slider" />
            </div>
            <Divider orientation="vertical" style={{ borderColor: "white" }} />
            {/* 退出全屏按钮 */}
            <div className="flex items-center justify-center flex-shrink-0 transition-all cursor-pointer hover:scale-110" onClick={handleClose}>
              <FullscreenExitOutlined className="text-sm text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
