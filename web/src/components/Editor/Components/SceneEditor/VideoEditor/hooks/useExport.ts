import { useState, useRef } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { MediaItem, TimelineClip } from "../types";
import {
  exportProjectAsJSON,
  importProjectFromJSON,
  loadProjectData,
  ProjectData,
} from "../utils/projectData";
import { historyManager } from "../utils/HistoryManager";
import { exportFrameAsPNG } from "../utils/etroExporter";
import { exportAsMP4 } from "../utils/ffmpegExporter";
import { getBaseCanvasSize } from "../utils/canvasCoordinates";

/**
 * 导出功能Hook的参数接口
 */
interface UseExportProps {
  /** 所有时间轴片段 */
  clips: TimelineClip[];
  /** 媒体素材库 */
  mediaItems: MediaItem[];
  /** 项目名称 */
  projectName: string;
  /** 画布比例 */
  canvasRatio: string;
  /** 时间轴缩放等级 */
  scale: number;
  /** 当前播放时间 */
  currentTime: number;
  /** 当前选中的片段ID */
  selectedClipId: string | null;
  /** 设置媒体素材列表 */
  setMediaItems: (items: MediaItem[]) => void;
  /** 设置时间轴片段列表 */
  setClips: (clips: TimelineClip[]) => void;
  /** 设置画布比例 */
  setCanvasRatio: (ratio: string) => void;
  /** 设置时间轴缩放等级 */
  setScale: (scale: number) => void;
  /** 设置当前播放时间 */
  setCurrentTime: (time: number) => void;
  /** 设置选中片段ID */
  setSelectedClipId: (id: string | null) => void;
  /** 设置项目名称 */
  setProjectName: (name: string) => void;
  /** 更新历史记录按钮状态 */
  updateHistoryButtons: () => void;
  /** 强制更新文本片段的引用 */
  forceUpdateTextRef: { current: (() => void) | null };
}

/**
 * 导出和项目管理自定义Hook
 * 
 * 集中管理视频编辑器的导出和项目管理功能，包括：
 * 
 * 项目管理：
 * - 保存项目为JSON文件（exportProjectAsJSON）
 * - 从JSON文件加载项目（handleProjectLoad）
 * - 项目数据序列化和反序列化
 * 
 * 视频导出：
 * - 导出为MP4视频（使用FFmpeg.wasm）
 * - 导出当前帧为PNG图片（使用Etro）
 * - 导出进度跟踪（0-100%）
 * - 导出完成后提供下载
 * 
 * 状态管理：
 * - 导出进度（exportProgress）
 * - 导出状态（isExporting）
 * - 导出完成标志（exportComplete）
 * - 导出的视频Blob（exportedBlob）
 * 
 * @param props - 导出功能所需的参数
 * @returns 包含导出功能相关函数和状态的对象
 * 
 * @example
 * ```tsx
 * const {
 *   exportProgress,
 *   isExporting,
 *   handleExportAsMP4,
 *   handleExportFrame,
 *   handleProjectSave,
 *   handleProjectLoad,
 *   handleDownloadVideo
 * } = useExport({
 *   clips,
 *   mediaItems,
 *   projectName,
 *   canvasRatio,
 *   scale,
 *   currentTime,
 *   selectedClipId,
 *   setMediaItems,
 *   setClips,
 *   setCanvasRatio,
 *   setScale,
 *   setCurrentTime,
 *   setSelectedClipId,
 *   setProjectName,
 *   updateHistoryButtons,
 *   forceUpdateTextRef
 * });
 * 
 * // 导出为MP4
 * await handleExportAsMP4();
 * 
 * // 导出当前帧为PNG
 * await handleExportFrame();
 * ```
 */
export const useExport = ({
  clips,
  mediaItems,
  projectName,
  canvasRatio,
  scale,
  currentTime,
  selectedClipId,
  setMediaItems,
  setClips,
  setCanvasRatio,
  setScale,
  setCurrentTime,
  setSelectedClipId,
  setProjectName,
  updateHistoryButtons,
  forceUpdateTextRef,
}: UseExportProps) => {
  const { t } = useTranslation();
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedFormat, setExportedFormat] = useState<string>("");
  const [exportPopoverVisible, setExportPopoverVisible] = useState(false);

  // 用于中止导出的控制器
  const abortControllerRef = useRef<AbortController | null>(null);

  // 导出类型和格式
  const [exportType, setExportType] = useState<string>("VIDEO"); // VIDEO, IMAGE, AUDIO
  const [videoFormat, setVideoFormat] = useState<string>("MP4"); // MP4, MOV
  const [imageFormat, setImageFormat] = useState<string>("PNG"); // PNG, JPG

  // 导出配置选项
  const [exportResolution, setExportResolution] = useState<string>("1920x1080");
  const [exportFrameRate, setExportFrameRate] = useState<number>(30);
  const [exportBitrate, setExportBitrate] = useState<string>("recommended");
  const [exportBitrateMode, setExportBitrateMode] = useState<string>("CBR");
  const [exportCustomBitrate, setExportCustomBitrate] = useState<string>("5000");
  const [exportCodec, setExportCodec] = useState<string>("libx264");
  const [exportAudioSampleRate, setExportAudioSampleRate] = useState<number>(44100);
  const [exportAudioQuality, setExportAudioQuality] = useState<string>("aac_192");

  // 音频导出配置选项
  const [audioExportFormat, setAudioExportFormat] = useState<string>("MP3");
  const [audioExportBitrate, setAudioExportBitrate] = useState<string>("192");
  const [audioExportSampleRate, setAudioExportSampleRate] = useState<number>(44100);

  // 保存项目为JSON
  const handleSaveProject = async () => {
    try {
      // 计算项目总时长
      const maxClipEnd = clips.length > 0 ? Math.max(...clips.map(c => c.end)) : 0;
      const projectDuration = Math.max(maxClipEnd, currentTime);

      // 根据画布比例获取虚拟坐标系统尺寸（统一使用共享函数）
      const canvasSize = getBaseCanvasSize(canvasRatio);

      await exportProjectAsJSON(
        projectName,
        mediaItems,
        clips,
        {
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundColor: "#000000",
          ratio: canvasRatio,
        },
        {
          scale,
          currentTime,
          duration: projectDuration,
        },
        {
          selectedClipId,
          playState: "paused",
        }
      );
      message.success(t("message.projectSaved"));
    } catch (error) {
      console.error("保存项目失败:", error);
      message.error(t("message.saveProjectFailed"));
    }
  };

  // 加载项目
  const handleLoadProject = async (file: File) => {
    try {
      const projectData = await importProjectFromJSON(file);
      const {
        mediaItems: loadedMediaItems,
        clips: loadedClips,
        canvas,
        timeline,
        editor,
      } = loadProjectData(projectData);

      setMediaItems(loadedMediaItems);
      setClips(loadedClips);
      setCanvasRatio(canvas.ratio);
      setScale(timeline.scale);
      setCurrentTime(timeline.currentTime);
      setSelectedClipId(editor.selectedClipId);
      setProjectName(projectData.projectName);

      historyManager.clear();
      historyManager.push(
        loadedClips,
        loadedMediaItems,
        editor.selectedClipId,
        "加载项目"
      );
      updateHistoryButtons();

      setTimeout(() => {
        forceUpdateTextRef.current?.();
      }, 100);

      message.success(`${t("message.projectLoaded")}: "${projectData.projectName}"`);
    } catch (error) {
      console.error("加载项目失败:", error);
      message.error(
        `${t("message.loadProjectFailed")}: ` + (error instanceof Error ? error.message : t("message.unknownError"))
      );
    }
  };

  // 取消导出
  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      console.log('🛑 正在取消导出...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExporting(false);
    setExportProgress(0);
    setExportComplete(false);
    setExportedBlob(null);
    message.info(t('export.cancelled'));
  };

  // 导出功能
  const handleExportConfirm = async () => {
    setExportPopoverVisible(false);

    if (clips.length === 0) {
      message.warning(t("message.noContentToExport"));
      return;
    }

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    setIsExporting(true); // 设置导出面板显示状态： 显示
    setExportProgress(0);
    setExportComplete(false);
    setExportedBlob(null);

    try {
      if (exportType === "IMAGE") {
        setExportedFormat(imageFormat);
        await exportAsImage();
      } else if (exportType === "VIDEO") {
        setExportedFormat(videoFormat);
        await exportAsVideo();
      } else if (exportType === "AUDIO") {
        setExportedFormat("AUDIO");
        await exportAsAudio();
      }
    } catch (error) {
      // 如果是主动取消，不显示错误消息
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('导出已被用户取消');
        return;
      }
      console.error("导出失败:", error);
      setIsExporting(false);
      message.error(
        `${t("export.failed")}: ${error instanceof Error ? error.message : t("message.unknownError")}`
      );
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleDownload = () => {
    if (!exportedBlob) return;

    const url = URL.createObjectURL(exportedBlob);
    const link = document.createElement("a");
    link.href = url;
    let extension = "mp4";
    let prefix = "video-editor";

    if (exportedFormat === "PNG") {
      extension = "png";
      prefix = "image-export";
    } else if (exportedFormat === "JPG") {
      extension = "jpg";
      prefix = "image-export";
    } else if (exportedFormat === "MOV") {
      extension = "mov";
    } else if (exportedFormat === "MP4") {
      extension = "mp4";
    } else if (exportedFormat === "AUDIO") {
      extension = audioExportFormat.toLowerCase();
      prefix = "audio-export";
    }

    const fileName = `${prefix}-${Date.now()}.${extension}`;

    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    setExportProgress(0);
    setExportComplete(false);
    setExportedBlob(null);
  };

  const exportAsImage = async () => {
    try {
      const signal = abortControllerRef.current?.signal;
      if (signal?.aborted) {
        throw new DOMException('Export was cancelled', 'AbortError');
      }

      const blob = await exportFrameAsPNG(
        clips,
        mediaItems,
        currentTime,
        exportResolution,
        setExportProgress,
        imageFormat,
        canvasRatio
      );

      if (signal?.aborted) {
        throw new DOMException('Export was cancelled', 'AbortError');
      }

      setExportedBlob(blob);
      setExportProgress(100);

      // 在100%停顿500毫秒后再显示下载页面
      await new Promise(resolve => setTimeout(resolve, 500));

      setExportComplete(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error; // 重新抛出取消错误
      }
      console.error("导出图片错误:", error);
      setIsExporting(false);
      message.error(`${t("message.exportImageFailed")}: ` + (error instanceof Error ? error.message : t("message.unknownError")));
    }
  };

  const exportAsVideo = async () => {
    try {
      const signal = abortControllerRef.current?.signal;
      if (signal?.aborted) {
        throw new DOMException('Export was cancelled', 'AbortError');
      }

      // 确定实际使用的码率
      let actualBitrate = exportBitrate;
      if (exportBitrate === "custom") {
        // 将 KBPS 转换为 FFmpeg 格式（k 为单位）
        actualBitrate = `${exportCustomBitrate}k`;
      }

      const blob = await exportAsMP4(
        clips,
        mediaItems,
        canvasRatio,
        setExportProgress,
        {
          resolution: exportResolution,
          frameRate: exportFrameRate,
          bitrate: actualBitrate,
          bitrateMode: exportBitrateMode,
          codec: exportCodec,
          audioSampleRate: exportAudioSampleRate,
          audioQuality: exportAudioQuality,
          format: videoFormat,
        },
        signal
      );

      if (signal?.aborted) {
        throw new DOMException('Export was cancelled', 'AbortError');
      }

      setExportedBlob(blob);
      setExportProgress(100);

      // 在100%停顿500毫秒后再显示下载页面
      await new Promise(resolve => setTimeout(resolve, 500));

      setExportComplete(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error; // 重新抛出取消错误
      }
      console.error("导出视频错误:", error);
      setIsExporting(false);
      message.error(`${t("message.exportVideoFailed")}: ` + (error instanceof Error ? error.message : t("message.unknownError")));
    }
  };

  const exportAsAudio = async () => {
    try {
      const signal = abortControllerRef.current?.signal;
      if (signal?.aborted) {
        throw new DOMException('Export was cancelled', 'AbortError');
      }

      // 动态导入音频导出器
      const { exportAudio } = await import("../utils/audioExporter");

      const blob = await exportAudio(
        clips,
        mediaItems,
        setExportProgress,
        {
          format: audioExportFormat,
          bitrate: audioExportBitrate,
          sampleRate: audioExportSampleRate,
        },
        signal
      );

      if (signal?.aborted) {
        throw new DOMException('Export was cancelled', 'AbortError');
      }

      setExportedBlob(blob);
      setExportProgress(100);

      // 在100%停顿500毫秒后再显示下载页面
      await new Promise(resolve => setTimeout(resolve, 500));

      setExportComplete(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error; // 重新抛出取消错误
      }
      console.error("导出音频错误:", error);
      setIsExporting(false);
      message.error(`导出音频失败: ` + (error instanceof Error ? error.message : "未知错误"));
    }
  };

  return {
    // 状态
    exportProgress,
    isExporting,
    setIsExporting,
    exportComplete,
    setExportComplete,
    exportedBlob,
    setExportedBlob,
    exportedFormat,
    exportPopoverVisible,
    setExportPopoverVisible,
    setExportProgress,

    // 导出类型和格式
    exportType,
    setExportType,
    videoFormat,
    setVideoFormat,
    imageFormat,
    setImageFormat,

    // 导出配置
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

    // 音频导出配置
    audioExportFormat,
    setAudioExportFormat,
    audioExportBitrate,
    setAudioExportBitrate,
    audioExportSampleRate,
    setAudioExportSampleRate,

    // 方法
    handleSaveProject,
    handleLoadProject,
    handleExportConfirm,
    handleDownload,
    handleCancelExport,
  };
};

