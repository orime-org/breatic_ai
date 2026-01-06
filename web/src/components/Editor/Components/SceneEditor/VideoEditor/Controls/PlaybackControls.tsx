import React from "react";
import { Slider, Tooltip, Divider } from "antd";
import { useTranslation } from "react-i18next";
import {
  StepBackwardOutlined,
  CaretRightOutlined,
  PauseOutlined,
  StepForwardOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DeleteOutlined,
  BorderRightOutlined,
  BorderLeftOutlined,
  FullscreenOutlined,
} from "@ant-design/icons";

interface PlaybackControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  scale: number;
  selectedClipId: string | null;
  canUndo: boolean; // 是否可以撤销
  canRedo: boolean; // 是否可以重做
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onScaleChange: (scale: number) => void;
  onCopyClip: () => void;
  onSplitClip: () => void;
  onDeleteClip: () => void;
  onReset: () => void; // 重置播放控制器
  onUndo: () => void; // 撤销
  onRedo: () => void; // 重做
  onSplitLeft: () => void; // 向左分割
  onSplitRight: () => void; // 向右分割
  onFullscreen: () => void; // 全屏预览
}

const PlaybackControlsComponent: React.FC<PlaybackControlsProps> = ({
  currentTime,
  duration,
  isPlaying,
  scale,
  selectedClipId,
  canUndo,
  canRedo,
  onTimeChange,
  onPlayPause,
  onScaleChange,
  onCopyClip,
  onSplitClip,
  onDeleteClip,
  onReset,
  onUndo,
  onRedo,
  onSplitLeft,
  onSplitRight,
  onFullscreen,
}) => {
  const { t } = useTranslation();

  const formatTime = (seconds: number) => {
    const totalFrames = Math.floor(seconds * 30);
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = totalFrames % 30;

    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-2 bg-white border-t border-b border-gray-300 nowheel nodrag nopan"
      data-nowheel="true"
      data-nodrag="true"
      data-nopan="true"
      style={{ zIndex: 10, height: "45px" }}
    >
      {/* 左侧：编辑工具 */}
      <div className="flex items-center gap-6">
        <Tooltip title={t("playbackControls.reset")} placement="top">
          <img
            src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/refresh.png")}
            alt={t("playbackControls.reset")}
            className="w-3.5 h-3.5 cursor-pointer hover:opacity-70"
            onClick={onReset}
          />
        </Tooltip>
        <Divider orientation="vertical" />
        <Tooltip title={t("playbackControls.undo")} placement="top">
          <img
            src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/1_return.png")}
            alt={t("playbackControls.undo")}
            className={`w-3.5 h-3.5 cursor-pointer transition-opacity ${
              canUndo ? "hover:opacity-70" : "opacity-30 cursor-not-allowed"
            }`}
            onClick={canUndo ? onUndo : undefined}
          />
        </Tooltip>
        <Tooltip title={t("playbackControls.redo")} placement="top">
          <img
            src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/1_go-on.png")}
            alt={t("playbackControls.redo")}
            className={`w-3.5 h-3.5 cursor-pointer transition-opacity ${
              canRedo ? "hover:opacity-70" : "opacity-30 cursor-not-allowed"
            }`}
            onClick={canRedo ? onRedo : undefined}
          />
        </Tooltip>
        <Divider orientation="vertical" />
        <Tooltip title={t("playbackControls.splitLeft")} placement="top">
          <BorderRightOutlined
            className={`text-sm ${
              selectedClipId
                ? "cursor-pointer hover:text-blue-500"
                : "opacity-30 cursor-not-allowed"
            }`}
            style={{ color: selectedClipId ? "#181818" : "#71717a" }}
            onClick={selectedClipId ? onSplitLeft : undefined}
          />
        </Tooltip>
        <Tooltip title={t("playbackControls.splitRight")} placement="top">
          <BorderLeftOutlined
            className={`text-sm ${
              selectedClipId
                ? "cursor-pointer hover:text-blue-500"
                : "opacity-30 cursor-not-allowed"
            }`}
            style={{ color: selectedClipId ? "#181818" : "#71717a" }}
            onClick={selectedClipId ? onSplitRight : undefined}
          />
        </Tooltip>
        <Tooltip title={t("playbackControls.split")} placement="top">
          <img
            src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/switch-contrast.png")}
            alt={t("playbackControls.split")}
            className={`w-3.5 h-3.5 ${
              selectedClipId
                ? "cursor-pointer hover:opacity-70"
                : "opacity-30 cursor-not-allowed"
            }`}
            onClick={selectedClipId ? onSplitClip : undefined}
          />
        </Tooltip>
        <Tooltip title={t("playbackControls.copy")} placement="top">
          <img
            src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/copy.png")}
            alt={t("playbackControls.copy")}
            className={`w-3.5 h-3.5 ${
              selectedClipId
                ? "cursor-pointer hover:opacity-70"
                : "opacity-30 cursor-not-allowed"
            }`}
            onClick={selectedClipId ? onCopyClip : undefined}
          />
        </Tooltip>
        <Divider orientation="vertical" />
        <Tooltip title={t("playbackControls.delete")} placement="top">
          <DeleteOutlined
            className={`text-sm ${
              selectedClipId
                ? "cursor-pointer hover:text-red-500"
                : "opacity-30 cursor-not-allowed"
            }`}
            style={{ color: selectedClipId ? "#181818" : "#71717a" }}
            onClick={selectedClipId ? onDeleteClip : undefined}
          />
        </Tooltip>
      </div>

      {/* 中间：播放控制和时间显示 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Tooltip title={t("playbackControls.stepBackward")} placement="top">
            <StepBackwardOutlined
              className={`${
                duration > 0
                  ? "cursor-pointer hover:text-blue-500"
                  : "opacity-30 cursor-not-allowed"
              }`}
              style={{ color: "#181818", fontSize: "16px" }}
              onClick={
                duration > 0
                  ? () => onTimeChange(Math.max(0, currentTime - 1))
                  : undefined
              }
            />
          </Tooltip>
          <Tooltip
            title={
              isPlaying
                ? t("playbackControls.pause")
                : t("playbackControls.play")
            }
            placement="top"
          >
            <div
              className={`flex items-center justify-center rounded-full ${
                duration > 0
                  ? "cursor-pointer hover:bg-blue-50"
                  : "opacity-30 cursor-not-allowed"
              }`}
              style={{ width: "32px", height: "32px" }}
              onClick={duration > 0 ? onPlayPause : undefined}
            >
              {isPlaying ? (
                <PauseOutlined style={{ color: "#181818", fontSize: "16px" }} />
              ) : (
                <CaretRightOutlined
                  style={{ color: "#181818", fontSize: "14px" }}
                />
              )}
            </div>
          </Tooltip>
          <Tooltip title={t("playbackControls.stepForward")} placement="top">
            <StepForwardOutlined
              className={`${
                duration > 0
                  ? "cursor-pointer hover:text-blue-500"
                  : "opacity-30 cursor-not-allowed"
              }`}
              style={{ color: "#181818", fontSize: "16px" }}
              onClick={
                duration > 0
                  ? () => onTimeChange(Math.min(duration, currentTime + 1))
                  : undefined
              }
            />
          </Tooltip>
        </div>

        {/* 时间显示 */}
        <div className="flex items-center gap-2 font-mono text-sm text-gray-600">
          <span style={{ color: "#71717a" }}>{formatTime(currentTime)}</span>
          <span>/</span>
          <span style={{ color: "#e4e4e7" }}>{formatTime(duration)}</span>
        </div>

        {/* 全屏按钮 */}
        <Tooltip title={t("playbackControls.fullscreen")} placement="top">
          <FullscreenOutlined
            className={`text-sm ml-4 ${
              duration > 0
                ? "cursor-pointer hover:text-blue-500"
                : "opacity-30 cursor-not-allowed"
            }`}
            style={{ color: "#181818" }}
            onClick={duration > 0 ? onFullscreen : undefined}
          />
        </Tooltip>
      </div>

      {/* 右侧：缩放控制 */}
      <div className="flex items-center gap-2">
        <Divider orientation="vertical" />
        <Tooltip title={t("playbackControls.zoomOut")} placement="top">
          <ZoomOutOutlined
            className="text-base cursor-pointer hover:text-blue-500"
            style={{ color: "#181818" }}
            onClick={() => onScaleChange(Math.max(1, scale - 1))}
          />
        </Tooltip>
        <Slider
          min={1}
          max={10}
          step={1}
          value={scale}
          onChange={onScaleChange}
          marks={{
            1: "",
            2: "",
            3: "",
            4: "",
            5: "",
            6: "",
            7: "",
            8: "",
            9: "",
            10: "",
          }}
          className="w-32"
          styles={{ track: { backgroundColor: "#18181b" } }}
        />
        <Tooltip title={t("playbackControls.zoomIn")} placement="top">
          <ZoomInOutlined
            className="text-base cursor-pointer hover:text-blue-500"
            style={{ color: "#181818" }}
            onClick={() => onScaleChange(Math.min(10, scale + 1))}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export const PlaybackControls = React.memo(PlaybackControlsComponent);
