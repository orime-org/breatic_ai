import React from "react";
import { Button, Select, Input } from "antd";
import { useTranslation } from "react-i18next";

interface ExportPanelProps {
  // 导出类型和格式
  exportType: string;
  setExportType: (type: string) => void;
  videoFormat: string;
  setVideoFormat: (format: string) => void;
  imageFormat: string;
  setImageFormat: (format: string) => void;

  // 视频配置
  canvasRatio: string;
  exportResolution: string;
  setExportResolution: (resolution: string) => void;
  exportFrameRate: number;
  setExportFrameRate: (frameRate: number) => void;
  exportBitrate: string;
  setExportBitrate: (bitrate: string) => void;
  exportBitrateMode: string;
  setExportBitrateMode: (mode: string) => void;
  exportCustomBitrate: string;
  setExportCustomBitrate: (bitrate: string) => void;
  exportCodec: string;
  setExportCodec: (codec: string) => void;
  exportAudioSampleRate: number;
  setExportAudioSampleRate: (rate: number) => void;
  exportAudioQuality: string;
  setExportAudioQuality: (quality: string) => void;

  // 音频导出配置
  audioExportFormat: string;
  setAudioExportFormat: (format: string) => void;
  audioExportBitrate: string;
  setAudioExportBitrate: (bitrate: string) => void;
  audioExportSampleRate: number;
  setAudioExportSampleRate: (rate: number) => void;

  // 回调
  onExport: () => void;
}

/**
 * 导出配置面板组件
 *
 * 集中管理所有导出相关的UI配置选项，包括：
 * - 视频导出（MP4/MOV）：支持分辨率、帧率、码率、编解码器等配置
 * - 图片导出（PNG/JPG）：支持分辨率配置
 * - 音频导出（MP3/WAV/AAC/FLAC/AIFF/OGG）：支持码率、采样率等配置
 */
export const ExportPanel: React.FC<ExportPanelProps> = ({
  exportType,
  setExportType,
  videoFormat,
  setVideoFormat,
  imageFormat,
  setImageFormat,
  canvasRatio,
  exportResolution,
  setExportResolution,
  exportFrameRate,
  setExportFrameRate,
  exportBitrate,
  setExportBitrate,
  exportBitrateMode,
  setExportBitrateMode,
  exportCustomBitrate,
  setExportCustomBitrate,
  exportCodec,
  setExportCodec,
  exportAudioSampleRate,
  setExportAudioSampleRate,
  exportAudioQuality,
  setExportAudioQuality,
  audioExportFormat,
  setAudioExportFormat,
  audioExportBitrate,
  setAudioExportBitrate,
  audioExportSampleRate,
  setAudioExportSampleRate,
  onExport,
}) => {
  const { t } = useTranslation();

  // 根据画布比例生成对应的分辨率选项
  const getResolutionOptions = () => {
    switch (canvasRatio) {
      case "16:9":
        return [
          { value: "854x480", label: "480P (854x480)" },
          { value: "1280x720", label: "720P (1280x720)" },
          { value: "1920x1080", label: "1080P (1920x1080)" },
          { value: "2560x1440", label: "2K (2560x1440)" },
          { value: "3840x2160", label: "4K (3840x2160)" },
          { value: "7680x4320", label: "8K (7680x4320)" },
        ];
      case "9:16":
        return [
          { value: "480x854", label: "480P (480x854)" },
          { value: "720x1280", label: "720P (720x1280)" },
          { value: "1080x1920", label: "1080P (1080x1920)" },
          { value: "1440x2560", label: "2K (1440x2560)" },
          { value: "2160x3840", label: "4K (2160x3840)" },
          { value: "4320x7680", label: "8K (4320x7680)" },
        ];
      case "1:1":
        return [
          { value: "480x480", label: "480P (480x480)" },
          { value: "720x720", label: "720P (720x720)" },
          { value: "1080x1080", label: "1080P (1080x1080)" },
          { value: "1440x1440", label: "2K (1440x1440)" },
          { value: "2160x2160", label: "4K (2160x2160)" },
          { value: "4320x4320", label: "8K (4320x4320)" },
        ];
    }
    return;
  };

  return (
    <div style={{ width: "220px" }}>
      <div
        className="mb-3 font-medium text-gray-900"
        style={{ fontSize: "12px" }}
      >
        {t("export.title")}
      </div>

      {/* 导出类型选择 */}
      <div className="mb-3">
        <label
          className="block mb-1 text-gray-600"
          style={{ fontSize: "12px" }}
        >
          {t("export.exportType")}
        </label>
        <Select
          value={exportType}
          onChange={setExportType}
          style={{
            width: "100%",
            height: "26px",
            fontSize: "12px",
            borderRadius: "4px",
          }}
          options={[
            { value: "VIDEO", label: t("export.video") },
            { value: "IMAGE", label: t("export.image") },
            { value: "AUDIO", label: t("export.audio") },
          ]}
        />
      </div>

      {/* 视频格式选择 */}
      {exportType === "VIDEO" && (
        <div className="mb-3">
          <label
            className="block mb-1 text-gray-600"
            style={{ fontSize: "12px" }}
          >
            {t("export.videoFormat")}
          </label>
          <Select
            value={videoFormat}
            onChange={setVideoFormat}
            style={{
              width: "100%",
              height: "26px",
              fontSize: "12px",
              borderRadius: "4px",
            }}
            options={[
              { value: "MP4", label: "MP4" },
              { value: "MOV", label: "MOV" },
            ]}
          />
        </div>
      )}

      {/* 图片格式选择 */}
      {exportType === "IMAGE" && (
        <>
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.imageFormat")}
            </label>
            <Select
              value={imageFormat}
              onChange={setImageFormat}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={[
                { value: "PNG", label: "PNG" },
                { value: "JPG", label: "JPG" },
              ]}
            />
          </div>

          {/* 图片分辨率 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.resolution")}
            </label>
            <Select
              value={exportResolution}
              onChange={setExportResolution}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={getResolutionOptions()}
            />
          </div>
        </>
      )}

      {/* 视频配置选项 */}
      {exportType === "VIDEO" && (
        <>
          {/* 分辨率 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.resolution")}
            </label>
            <Select
              value={exportResolution}
              onChange={setExportResolution}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={getResolutionOptions()}
            />
          </div>

          {/* 帧率 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.frameRate")}
            </label>
            <Select
              value={exportFrameRate}
              onChange={setExportFrameRate}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={[
                { value: 24, label: "24 fps" },
                { value: 25, label: "25 fps" },
                { value: 29.97, label: "29.97 fps" },
                { value: 30, label: "30 fps" },
                { value: 50, label: "50 fps" },
                { value: 59.94, label: "59.94 fps" },
                { value: 60, label: "60 fps" },
              ]}
            />
          </div>

          {/* 视频码率 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.bitrate")}
            </label>
            <Select
              value={exportBitrate}
              onChange={setExportBitrate}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={[
                {
                  value: "lower",
                  label: t("export.bitrateOptions.lower"),
                },
                {
                  value: "recommended",
                  label: t("export.bitrateOptions.recommended"),
                },
                {
                  value: "higher",
                  label: t("export.bitrateOptions.higher"),
                },
                {
                  value: "custom",
                  label: t("export.bitrateOptions.custom"),
                },
              ]}
            />
          </div>

          {/* 自定义码率 */}
          {exportBitrate === "custom" && (
            <>
              <div className="mb-3">
                <label
                  className="block mb-1 text-gray-600"
                  style={{ fontSize: "12px" }}
                >
                  {t("export.bitrateMode")}
                </label>
                <Select
                  value={exportBitrateMode}
                  onChange={setExportBitrateMode}
                  style={{
                    width: "100%",
                    height: "26px",
                    fontSize: "12px",
                    borderRadius: "4px",
                  }}
                  options={[
                    {
                      value: "CBR",
                      label: t("export.bitrateModeOptions.cbr"),
                    },
                    {
                      value: "VBR",
                      label: t("export.bitrateModeOptions.vbr"),
                    },
                  ]}
                />
              </div>
              <div className="mb-3">
                <label
                  className="block mb-1 text-gray-600"
                  style={{ fontSize: "12px" }}
                >
                  {t("export.customBitrate")} (KBPS)
                </label>
                <Input
                  type="number"
                  value={exportCustomBitrate}
                  onChange={(e) => setExportCustomBitrate(e.target.value)}
                  placeholder="5000"
                  min={100}
                  max={100000}
                  style={{
                    width: "100%",
                    height: "26px",
                    fontSize: "12px",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </>
          )}

          {/* 视频编码 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.codec")}
            </label>
            <Select
              value={exportCodec}
              onChange={setExportCodec}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={[
                { value: "libx264", label: "H.264" },
                { value: "libx265", label: "HEVC" },
                { value: "libx265_alpha", label: "HEVC (Alpha)" },
                { value: "libx265_422", label: "HEVC (422)" },
                { value: "libaom-av1", label: "AV1" },
                { value: "rle", label: "RLE" },
              ]}
            />
          </div>

          {/* 音频采样率 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.audioSampleRate")}
            </label>
            <Select
              value={exportAudioSampleRate}
              onChange={setExportAudioSampleRate}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={[
                { value: 44100, label: "44100 Hz" },
                { value: 48000, label: "48000 Hz" },
              ]}
            />
          </div>

          {/* 音频质量 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.audioQuality")}
            </label>
            <Select
              value={exportAudioQuality}
              onChange={setExportAudioQuality}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={[
                { value: "aac_192", label: "AAC 192 kbps" },
                { value: "aac_256", label: "AAC 256 kbps" },
                { value: "aac_320", label: "AAC 320 kbps" },
                {
                  value: "pcm",
                  label: t("export.audioQualityOptions.pcm"),
                },
              ]}
            />
          </div>
        </>
      )}

      {/* 音频格式配置选项 */}
      {exportType === "AUDIO" && (
        <>
          {/* 音频格式 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.audioFormat")}
            </label>
            <Select
              value={audioExportFormat}
              onChange={setAudioExportFormat}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={[
                { value: "MP3", label: "MP3" },
                { value: "WAV", label: "WAV" },
                { value: "AAC", label: "AAC" },
                { value: "FLAC", label: "FLAC" },
                { value: "AIFF", label: "AIFF" },
                { value: "OGG", label: "OGG" },
              ]}
            />
          </div>

          {/* 音频比特率 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.audioBitrate")}
            </label>
            <Select
              value={audioExportBitrate}
              onChange={setAudioExportBitrate}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={[
                { value: "192", label: "192 kbps" },
                { value: "256", label: "256 kbps" },
                { value: "320", label: "320 kbps" },
              ]}
            />
          </div>

          {/* 音频采样率 */}
          <div className="mb-3">
            <label
              className="block mb-1 text-gray-600"
              style={{ fontSize: "12px" }}
            >
              {t("export.sampleRate")}
            </label>
            <Select
              value={audioExportSampleRate}
              onChange={setAudioExportSampleRate}
              style={{
                width: "100%",
                height: "26px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              options={[
                { value: 44100, label: "44100 Hz" },
                { value: 48000, label: "48000 Hz" },
              ]}
            />
          </div>
        </>
      )}

      {/* 导出按钮 */}
      <Button
        type="primary"
        className="w-full text-white bg-black border-black hover:bg-gray-800"
        style={{
          height: "26px",
          fontSize: "12px",
          marginTop: "10px",
          borderRadius: "4px",
        }}
        onClick={onExport}
      >
        {t("common.export")}
      </Button>
    </div>
  );
};
