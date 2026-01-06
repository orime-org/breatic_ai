import React, { useState, useEffect } from "react";
import { Input, Slider, ColorPicker } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { TimelineClip, MediaItem } from "../types";
import { CropModal } from "./CropModal";

interface VideoStylePanelProps {
  selectedClip: TimelineClip;
  mediaItem: MediaItem;
  onClose: () => void;
  onClipUpdate: (id: string, updates: Partial<TimelineClip>) => void;
}

const VideoStylePanelComponent: React.FC<VideoStylePanelProps> = ({
  selectedClip,
  mediaItem,
  onClose,
  onClipUpdate,
}) => {
  const { t } = useTranslation();
  const [mediaStyle, setMediaStyle] = useState(selectedClip.mediaStyle || {});
  const [volume, setVolume] = useState(selectedClip.volume ?? 100);
  const [videoOpacity, setVideoOpacity] = useState(selectedClip.opacity ?? 100);
  const [volumeInput, setVolumeInput] = useState(
    String(selectedClip.volume ?? 100)
  );
  const [opacityInput, setOpacityInput] = useState(
    String(selectedClip.opacity ?? 100)
  );
  const [borderRadiusInput, setBorderRadiusInput] = useState(
    String(selectedClip.mediaStyle?.borderRadius ?? 0)
  );
  const [outlineWidthInput, setOutlineWidthInput] = useState(
    String(selectedClip.mediaStyle?.outlineWidth ?? 0)
  );
  const [shadowXInput, setShadowXInput] = useState(
    String(selectedClip.mediaStyle?.shadowOffsetX ?? 0)
  );
  const [shadowYInput, setShadowYInput] = useState(
    String(selectedClip.mediaStyle?.shadowOffsetY ?? 0)
  );
  const [shadowBlurInput, setShadowBlurInput] = useState(
    String(selectedClip.mediaStyle?.shadowBlur ?? 0)
  );
  const [cropModalVisible, setCropModalVisible] = useState(false);

  // 当选中素材改变时，更新状态
  useEffect(() => {
    setMediaStyle(selectedClip.mediaStyle || {});
    setVolume(selectedClip.volume ?? 100);
    setVideoOpacity(selectedClip.opacity ?? 100);
    setVolumeInput(String(selectedClip.volume ?? 100));
    setOpacityInput(String(selectedClip.opacity ?? 100));
    setBorderRadiusInput(String(selectedClip.mediaStyle?.borderRadius ?? 0));
    setOutlineWidthInput(String(selectedClip.mediaStyle?.outlineWidth ?? 0));
    setShadowXInput(String(selectedClip.mediaStyle?.shadowOffsetX ?? 0));
    setShadowYInput(String(selectedClip.mediaStyle?.shadowOffsetY ?? 0));
    setShadowBlurInput(String(selectedClip.mediaStyle?.shadowBlur ?? 0));
  }, [
    selectedClip.id,
    selectedClip.mediaStyle,
    selectedClip.volume,
    selectedClip.opacity,
  ]);

  // 更新媒体样式
  const updateMediaStyle = (updates: Partial<typeof mediaStyle>) => {
    const newMediaStyle = { ...mediaStyle, ...updates };
    setMediaStyle(newMediaStyle);
    onClipUpdate(selectedClip.id, { mediaStyle: newMediaStyle });
  };

  // 更新音量
  const updateVolume = (value: number) => {
    setVolume(value);
    onClipUpdate(selectedClip.id, { volume: value });
  };

  // 更新不透明度
  const updateOpacity = (value: number) => {
    setVideoOpacity(value);
    onClipUpdate(selectedClip.id, { opacity: value });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="font-semibold" style={{ fontSize: "12px" }}>
          {t("toolbar.video")}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <CloseOutlined style={{ fontSize: "12px" }} />
        </button>
      </div>
      <div className="space-y-4">
        {/* 裁剪按钮 */}
        <div className="flex items-center py-3 border-b border-gray-200">
          <div
            className="p-2 transition-colors rounded cursor-pointer hover:bg-gray-200"
            style={{ backgroundColor: "#F4F4F5" }}
            onClick={() => setCropModalVisible(true)}
          >
            <img
              src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/tailoring.png")}
              alt={t("videoStyle.crop")}
              className="w-4 h-4"
            />
          </div>
        </div>

        {/* Basic */}
        <div>
          <h4
            className="mb-3 font-semibold text-gray-900"
            style={{ fontSize: "12px" }}
          >
            {t("videoStyle.title")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("videoStyle.volume")}
              </label>
              <div className="flex items-center gap-2 w-36">
                <Input
                  value={volumeInput}
                  onChange={(e) => setVolumeInput(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(volumeInput);
                    const finalValue = isNaN(val)
                      ? 100
                      : Math.max(0, Math.min(100, val));
                    setVolumeInput(String(finalValue));
                    setVolume(finalValue);
                    updateVolume(finalValue);
                  }}
                  onPressEnter={(e) => e.currentTarget.blur()}
                  className="text-center"
                  style={{
                    width: "35px",
                    height: "26px",
                    fontSize: "12px",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                />
                <div style={{ flex: 1, paddingRight: "10px" }}>
                  <Slider
                    value={volume}
                    onChange={(value) => {
                      setVolume(value);
                      setVolumeInput(String(value));
                      updateVolume(value);
                    }}
                    min={0}
                    max={100}
                    styles={{ track: { backgroundColor: "#18181b" } }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("videoStyle.opacity")}
              </label>
              <div className="flex items-center gap-2 w-36">
                <Input
                  value={opacityInput}
                  onChange={(e) => setOpacityInput(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(opacityInput);
                    const finalValue = isNaN(val)
                      ? 100
                      : Math.max(0, Math.min(100, val));
                    setOpacityInput(String(finalValue));
                    setVideoOpacity(finalValue);
                    updateOpacity(finalValue);
                  }}
                  onPressEnter={(e) => e.currentTarget.blur()}
                  className="text-center"
                  style={{
                    width: "35px",
                    height: "26px",
                    fontSize: "12px",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                />
                <div style={{ flex: 1, paddingRight: "10px" }}>
                  <Slider
                    value={videoOpacity}
                    onChange={(value) => {
                      setVideoOpacity(value);
                      setOpacityInput(String(value));
                      updateOpacity(value);
                    }}
                    min={0}
                    max={100}
                    styles={{ track: { backgroundColor: "#18181b" } }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("videoStyle.borderRadius")}
              </label>
              <div className="flex items-center gap-2 w-36">
                <Input
                  value={borderRadiusInput}
                  onChange={(e) => setBorderRadiusInput(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(borderRadiusInput);
                    const finalValue = isNaN(val)
                      ? 0
                      : Math.max(0, Math.min(100, val));
                    setBorderRadiusInput(String(finalValue));
                    updateMediaStyle({ borderRadius: finalValue });
                  }}
                  onPressEnter={(e) => e.currentTarget.blur()}
                  className="text-center"
                  style={{
                    width: "35px",
                    height: "26px",
                    fontSize: "12px",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                />
                <div style={{ flex: 1, paddingRight: "10px" }}>
                  <Slider
                    value={mediaStyle.borderRadius || 0}
                    onChange={(value) => {
                      setBorderRadiusInput(String(value));
                      updateMediaStyle({ borderRadius: value });
                    }}
                    min={0}
                    max={100}
                    styles={{ track: { backgroundColor: "#18181b" } }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Outline */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <h4
            className="mb-3 font-semibold text-gray-900"
            style={{ fontSize: "12px" }}
          >
            {t("videoStyle.outline")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("videoStyle.outlineColor")}
              </label>
              <div className="w-36">
                <ColorPicker
                  value={mediaStyle.outlineColor || "#000000"}
                  onChange={(color) =>
                    updateMediaStyle({ outlineColor: color.toHexString() })
                  }
                  size="small"
                  showText
                  style={{
                    width: "100%",
                    justifyContent: "left",
                    padding: "4px 7px",
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("videoStyle.outlineWidth")}
              </label>
              <Input
                type="number"
                value={outlineWidthInput}
                onChange={(e) => setOutlineWidthInput(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(outlineWidthInput);
                  const finalValue = isNaN(val) ? 0 : Math.max(0, val);
                  setOutlineWidthInput(String(finalValue));
                  updateMediaStyle({ outlineWidth: finalValue });
                }}
                onPressEnter={(e) => e.currentTarget.blur()}
                className="w-36"
                size="small"
              />
            </div>
          </div>
        </div>

        {/* Shadow */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <h4
            className="mb-3 font-semibold text-gray-900"
            style={{ fontSize: "12px" }}
          >
            {t("videoStyle.shadow")}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("videoStyle.shadowColor")}
              </label>
              <div className="w-36">
                <ColorPicker
                  value={mediaStyle.shadowColor || "#000000"}
                  onChange={(color) =>
                    updateMediaStyle({ shadowColor: color.toHexString() })
                  }
                  size="small"
                  showText
                  style={{
                    width: "100%",
                    justifyContent: "left",
                    padding: "4px 7px",
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("videoStyle.shadowX")}
              </label>
              <Input
                type="number"
                value={shadowXInput}
                onChange={(e) => setShadowXInput(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(shadowXInput);
                  const finalValue = isNaN(val) ? 0 : val;
                  setShadowXInput(String(finalValue));
                  updateMediaStyle({ shadowOffsetX: finalValue });
                }}
                onPressEnter={(e) => e.currentTarget.blur()}
                className="w-36"
                size="small"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("videoStyle.shadowY")}
              </label>
              <Input
                type="number"
                value={shadowYInput}
                onChange={(e) => setShadowYInput(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(shadowYInput);
                  const finalValue = isNaN(val) ? 0 : val;
                  setShadowYInput(String(finalValue));
                  updateMediaStyle({ shadowOffsetY: finalValue });
                }}
                onPressEnter={(e) => e.currentTarget.blur()}
                className="w-36"
                size="small"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-600" style={{ fontSize: "12px" }}>
                {t("videoStyle.shadowBlur")}
              </label>
              <Input
                type="number"
                value={shadowBlurInput}
                onChange={(e) => setShadowBlurInput(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(shadowBlurInput);
                  const finalValue = isNaN(val) ? 0 : Math.max(0, val);
                  setShadowBlurInput(String(finalValue));
                  updateMediaStyle({ shadowBlur: finalValue });
                }}
                onPressEnter={(e) => e.currentTarget.blur()}
                className="w-36"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 裁剪模态框 */}
      <CropModal
        visible={cropModalVisible}
        mediaUrl={mediaItem.url || ""}
        mediaType="video"
        mediaThumbnail={mediaItem.thumbnail}
        mediaWidth={mediaItem.width}
        mediaHeight={mediaItem.height}
        existingCrop={selectedClip.cropArea}
        onClose={() => setCropModalVisible(false)}
        onApply={(croppedVideoUrl: any, cropData: any) => {
          console.log("🎯 VideoStylePanel - 视频裁剪完成:", croppedVideoUrl);

          // 🎯 CSS 坐标裁剪：容器尺寸要合理，且宽高比匹配裁剪区域
          const currentWidth = selectedClip.width;
          const currentHeight = selectedClip.height;

          // 计算裁剪区域的宽高比
          const cropRatio = cropData.width / cropData.height;

          let newWidth, newHeight;

          if (currentWidth && currentHeight) {
            // 已有容器：保持面积相近，但调整宽高比为裁剪区域的比例
            const currentArea = currentWidth * currentHeight;
            // 根据裁剪区域的宽高比，重新计算容器尺寸
            newHeight = Math.sqrt(currentArea / cropRatio);
            newWidth = newHeight * cropRatio;

            console.log("  基于现有容器调整:");
            console.log(
              "    原容器:",
              currentWidth.toFixed(2),
              "x",
              currentHeight.toFixed(2)
            );
            console.log("    原面积:", currentArea.toFixed(2));
          } else {
            // 首次裁剪：模拟 MediaElement 的默认尺寸计算逻辑
            const canvasElement = document.getElementById("preview-canvas-bg");
            let canvasWidth = 1920;
            let canvasHeight = 1080;

            if (canvasElement) {
              canvasWidth = parseFloat(
                canvasElement.getAttribute("data-width") || "1920"
              );
              canvasHeight = parseFloat(
                canvasElement.getAttribute("data-height") || "1080"
              );
            }

            const maxWidth = canvasWidth * 0.5;
            const maxHeight = canvasHeight * 0.5;
            const mediaWidth = mediaItem?.width || cropData.width;
            const mediaHeight = mediaItem?.height || cropData.height;
            const mediaRatio = mediaWidth / mediaHeight;

            // 计算视频未裁剪时的默认显示尺寸
            let originalDisplayWidth: number;
            let originalDisplayHeight: number;
            if (mediaWidth > maxWidth || mediaHeight > maxHeight) {
              // 原始尺寸超过画布50%，需要缩放
              if (mediaRatio > maxWidth / maxHeight) {
                originalDisplayWidth = maxWidth;
                originalDisplayHeight = maxWidth / mediaRatio;
              } else {
                originalDisplayHeight = maxHeight;
                originalDisplayWidth = maxHeight * mediaRatio;
              }
            } else {
              // 原始尺寸小于画布50%，使用原始尺寸
              originalDisplayWidth = mediaWidth;
              originalDisplayHeight = mediaHeight;
            }

            // 计算裁剪比例（裁剪区域占原始视频的比例）
            const cropWidthRatio = cropData.width / mediaWidth;
            const cropHeightRatio = cropData.height / mediaHeight;

            // 裁剪后的容器 = 默认显示尺寸 × 裁剪比例
            newWidth = originalDisplayWidth * cropWidthRatio;
            newHeight = originalDisplayHeight * cropHeightRatio;

            console.log("  首次裁剪计算:");
            console.log("    画布尺寸:", canvasWidth, "x", canvasHeight);
            console.log("    原始视频:", mediaWidth, "x", mediaHeight);
            console.log(
              "    未裁剪显示尺寸:",
              originalDisplayWidth.toFixed(2),
              "x",
              originalDisplayHeight.toFixed(2)
            );
            console.log(
              "    裁剪比例:",
              cropWidthRatio.toFixed(4),
              "x",
              cropHeightRatio.toFixed(4)
            );
          }

          console.log("  裁剪区域比例:", cropRatio.toFixed(4));
          console.log(
            "  裁剪后容器:",
            newWidth.toFixed(2),
            "x",
            newHeight.toFixed(2)
          );
          console.log("  容器比例:", (newWidth / newHeight).toFixed(4));

          // CSS 裁剪只保存坐标，不保存 croppedUrl
          onClipUpdate(selectedClip.id, {
            cropArea: cropData,
            width: newWidth,
            height: newHeight,
          });
        }}
      />
    </>
  );
};

export const VideoStylePanel = React.memo(VideoStylePanelComponent);
