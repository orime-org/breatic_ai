import React, { useMemo, useState, useEffect, useCallback, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toolbar } from "./Sidebar/Toolbar";
import { LeftPanel } from "./Sidebar/LeftPanel";
import { RightPanel } from "./RightPanel/RightPanel";
import { PreviewCanvas } from "./Preview/PreviewCanvas";
import { PlaybackControls } from "./Controls/PlaybackControls";
import { TimelineEditor } from "./Timeline/TimelineEditor";
import { ProjectData } from "./utils/projectData";
import { TimelineClip } from "./types";
import { useProjectState } from "./hooks/useProjectState";
import { useHistoryOperations } from "./hooks/useHistoryOperations";
import { useClipOperations } from "./hooks/useClipOperations";
import { useExport } from "./hooks/useExport";
import { usePlaybackControl } from "./hooks/usePlaybackControl";
import { useInitialData } from "./hooks/useInitialData";
import { useAutoSave } from "./hooks/useAutoSave";
import { fontManager } from "./utils/fontDetector";
import fontConfigData from "./config/fontConfig.json";
import { getBaseCanvasSize } from "./utils/canvasCoordinates";
import { TopBar } from "./Header/TopBar";
import { ExportProgressModal } from "./common/ExportProgressModal";
import { FullscreenPreview } from "./Preview/FullscreenPreview";
import { useAutoSaveWithWorker } from "./hooks/useAutoSaveWithWorker";
import {NodeTemplateType} from "../../../Dict/dict";

interface VideoEditorProps {
  nodeId: string;
  nodeType: NodeTemplateType;
  anchorRef: RefObject<HTMLDivElement | null>;
  initialData?: ProjectData;
  onSave?: (projectData: ProjectData) => void | Promise<void>;
  onClose?: () => void; // 关闭按钮点击事件
  onSyncData?: () => void; // 同步数据按钮点击事件
  autoSaveDelay?: number;
  enableAutoSave?: boolean;
  reactflowScale?: number; // ReactFlow 节点的缩放系数（默认 1.0）
  isSyncing?: boolean; // 是否正在同步
}

const VideoEditor: React.FC<VideoEditorProps> = ({
  nodeId,
  nodeType,
  anchorRef,
  initialData,
  onSave,
  onClose,
  onSyncData,
  autoSaveDelay = 3000,
  enableAutoSave = false,
  reactflowScale = 1.0, // 默认缩放系数为 1（无缩放）
  isSyncing = false, // 默认不是正在同步
}) => {
  const { t } = useTranslation();

  // 1. 项目状态
  const projectState = useProjectState(nodeId);
  const {
    mediaItems,
    setMediaItems,
    clips,
    setClips,
    projectName,
    setProjectName,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    scale,
    setScale,
    selectedClipId,
    setSelectedClipId,
    activePanel,
    setActivePanel,
    canvasRatio,
    setCanvasRatio,
    forceUpdateTextRef,
    isUndoRedoInProgress,
  } = projectState;

  // 2. 历史记录管理
  const historyOps = useHistoryOperations({
    clips,
    mediaItems,
    selectedClipId,
    setClips,
    setMediaItems,
    setSelectedClipId,
    isUndoRedoInProgress,
    forceUpdateTextRef,
  });
  const {
    canUndo,
    canRedo,
    saveToHistory,
    handleUndo,
    handleRedo,
    updateHistoryButtons,
  } = historyOps;

  // 3. 片段操作
  const clipOps = useClipOperations({
    clips,
    mediaItems,
    selectedClipId,
    currentTime,
    setClips,
    setMediaItems,
    setSelectedClipId,
    setCurrentTime,
    setIsPlaying,
    saveToHistory,
  });

  // 4. 导出功能
  const exportOps = useExport({
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
  });

  // 5. 播放控制
  const actualDuration = useMemo(() => {
    if (clips.length === 0) return 0;
    return Math.max(...clips.map((c) => c.end));
  }, [clips]);

  const playbackControl = usePlaybackControl({
    isPlaying,
    currentTime,
    actualDuration,
    scale,
    setCurrentTime,
    setIsPlaying,
  });

  // 6. 加载初始数据
  useInitialData({
    initialData,
    setMediaItems,
    setClips,
    setCanvasRatio,
    setScale,
    setCurrentTime,
    setSelectedClipId,
    setProjectName,
    updateHistoryButtons,
    forceUpdateTextRef,
  });

  // 7. 自动保存
  // useAutoSave({
  //   mediaItems,
  //   clips,
  //   projectName,
  //   canvasRatio,
  //   scale,
  //   currentTime,
  //   selectedClipId,
  //   onSave,
  //   autoSaveDelay,
  //   enabled: enableAutoSave,
  // });

  useAutoSaveWithWorker({
    mediaItems,
    clips,
    projectName,
    canvasRatio,
    scale,
    currentTime,
    selectedClipId,
    onSave,
    autoSaveDelay,
    enabled: enableAutoSave,
  });

  // 8. 初始化字体管理器
  useEffect(() => {
    fontManager.initialize(fontConfigData).catch((error) => {
      console.error("❌ 字体管理器初始化失败:", error);
    });
  }, []);

  // 9. 剪贴板状态（用于复制粘贴）
  const [copiedClip, setCopiedClip] = useState<TimelineClip | null>(null);

  // 10. 键盘事件监听（快捷键）
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     // 排除在输入框、文本框等可编辑元素中的按键事件
  //     const target = e.target as HTMLElement;
  //     const isEditableElement =
  //       target.tagName === "INPUT" ||
  //       target.tagName === "TEXTAREA" ||
  //       target.isContentEditable;

  //     const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  //     const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

  //     // Ctrl+Z / Cmd+Z - 撤销
  //     if (ctrlOrCmd && e.key === "z" && !e.shiftKey) {
  //       e.preventDefault();
  //       handleUndo();
  //       return;
  //     }

  //     // Ctrl+Shift+Z / Cmd+Shift+Z - 重做
  //     if (ctrlOrCmd && e.key === "z" && e.shiftKey) {
  //       e.preventDefault();
  //       handleRedo();
  //       return;
  //     }

  //     // Ctrl+C / Cmd+C - 复制选中片段到剪贴板
  //     if (ctrlOrCmd && e.key === "c") {
  //       if (!isEditableElement && selectedClipId) {
  //         e.preventDefault();
  //         const clipToCopy = clips.find((c) => c.id === selectedClipId);
  //         if (clipToCopy) {
  //           setCopiedClip(clipToCopy);
  //           // 可以添加提示
  //           console.log("片段已复制到剪贴板");
  //         }
  //       }
  //       return;
  //     }

  //     // Ctrl+V / Cmd+V - 粘贴剪贴板中的片段
  //     if (ctrlOrCmd && e.key === "v") {
  //       if (!isEditableElement && copiedClip) {
  //         e.preventDefault();
  //         // 创建新片段
  //         const newClip: TimelineClip = {
  //           ...copiedClip,
  //           id: `clip-${Date.now()}-${Math.random()}`,
  //           trackIndex: 0,
  //         };

  //         // 将所有现有片段的轨道索引 + 1
  //         const updatedClips = clips.map((c) => ({
  //           ...c,
  //           trackIndex: c.trackIndex + 1,
  //         }));

  //         // 将新片段添加到列表开头
  //         const newClips = [newClip, ...updatedClips];

  //         // 先更新 clips
  //         setClips(newClips);

  //         // 延迟选中新元素，确保 DOM 已更新（与添加片段逻辑一致）
  //         setTimeout(() => {
  //           setSelectedClipId(newClip.id);
  //         }, 0);

  //         // 保存到历史记录
  //         historyOps.saveToHistory(
  //           `粘贴片段`,
  //           newClips,
  //           mediaItems,
  //           newClip.id
  //         );
  //       }
  //       return;
  //     }

  //     // Space - 播放/暂停（不在可编辑元素中）
  //     if (e.key === " " || e.key === "Space") {
  //       if (!isEditableElement) {
  //         e.preventDefault();
  //         playbackControl.handlePlayPause();
  //       }
  //       return;
  //     }

  //     // Delete / Backspace - 删除选中片段
  //     if (e.key === "Delete" || e.key === "Backspace") {
  //       if (!isEditableElement && selectedClipId) {
  //         e.preventDefault(); // 阻止浏览器默认行为（如后退）
  //         clipOps.handleDeleteClip();
  //       }
  //       return;
  //     }
  //   };

  //   // 添加事件监听
  //   window.addEventListener("keydown", handleKeyDown);

  //   // 清理函数：组件卸载时移除监听器
  //   return () => {
  //     window.removeEventListener("keydown", handleKeyDown);
  //   };
  // }, [
  //   selectedClipId,
  //   clipOps,
  //   handleUndo,
  //   handleRedo,
  //   playbackControl,
  //   copiedClip,
  //   clips,
  //   mediaItems,
  //   setClips,
  //   setSelectedClipId,
  //   historyOps,
  // ]);

  // 11. 其他功能
  const [ratioPopoverVisible, setRatioPopoverVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleResizeChange = (ratio: string) => {
    // 先取消选中的元素
    setSelectedClipId(null);

    // 获取旧画布和新画布的虚拟尺寸
    const oldBaseSize = getBaseCanvasSize(canvasRatio);
    const newBaseSize = getBaseCanvasSize(ratio);

    // 转换所有元素的坐标到新坐标系统
    const convertedClips = clips.map((clip) => {
      // 音频片段不需要坐标
      if (clip.x === undefined && clip.y === undefined) {
        return clip;
      }

      // 计算元素中心点在旧画布中的相对位置（百分比）
      const centerX = (clip.x ?? 0) + (clip.width ?? 0) / 2;
      const centerY = (clip.y ?? 0) + (clip.height ?? 0) / 2;

      const relativeCenterX = centerX / oldBaseSize.width;
      const relativeCenterY = centerY / oldBaseSize.height;

      // 映射中心点到新画布（保持相对位置）
      const newCenterX = relativeCenterX * newBaseSize.width;
      const newCenterY = relativeCenterY * newBaseSize.height;

      // 计算新的左上角坐标（元素大小保持不变）
      const width = clip.width ?? 100;
      const height = clip.height ?? 100;

      let newX = newCenterX - width / 2;
      let newY = newCenterY - height / 2;

      // 确保元素不超出新画布边界
      newX = Math.max(0, Math.min(newX, newBaseSize.width - width));
      newY = Math.max(0, Math.min(newY, newBaseSize.height - height));

      return {
        ...clip,
        x: newX,
        y: newY,
        // width 和 height 保持不变
      };
    });

    // 更新片段列表并添加到历史记录
    historyOps.saveToHistory(
      `切换画布比例到 ${ratio}`,
      convertedClips,
      mediaItems,
      selectedClipId
    );
    setClips(convertedClips);

    // 切换画布比例
    setCanvasRatio(ratio);

    // 根据新比例自动调整导出分辨率
    switch (ratio) {
      case "16:9":
        exportOps.setExportResolution("1920x1080");
        break;
      case "9:16":
        exportOps.setExportResolution("1080x1920");
        break;
      case "1:1":
        exportOps.setExportResolution("1080x1080");
        break;
    }
  };

  // 轨道重新映射
  const handleTracksRemapped = (trackIndexMap: {
    [oldIndex: number]: number;
  }) => {
    if (isUndoRedoInProgress.current) {
      console.log("⏸️ 撤销/重做期间跳过轨道重新映射");
      return;
    }
    setClips((prev) =>
      prev.map((clip) => ({
        ...clip,
        trackIndex: trackIndexMap[clip.trackIndex] ?? clip.trackIndex,
      }))
    );
  };

  // 批量更新clips
  const handleBatchClipsUpdate = (
    updatedClips: TimelineClip[],
    skipHistory: boolean = false,
    description: string = "批量更新片段"
  ) => {
    if (!skipHistory) {
      saveToHistory(description, updatedClips, mediaItems, selectedClipId);
    }
    setClips(updatedClips);
  };

  // 获取选中的片段
  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  // 事件处理函数
  const handleRatioMenuItemClick = (itemOnClick: () => void) => {
    itemOnClick();
    setRatioPopoverVisible(false);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedClipId(null);
    }
  };

  const handleCloseClick = () => {
    // 调用父组件传入的关闭回调
    if (onClose) {
      onClose();
    }
  };

  const handleSyncDataClick = () => {
    // 调用父组件传入的同步数据回调
    if (onSyncData) {
      onSyncData();
    }
  };

  // 重置播放控制器
  const handleReset = () => {
    setCurrentTime(0);
    // 如果正在播放，重置后继续播放；否则只重置不播放
    // isPlaying 状态保持不变，让播放继续或保持暂停
  };

  // 全屏预览 - 使用 useCallback 避免函数引用变化
  const handleFullscreen = useCallback(() => {
    // 全屏和非全屏共享播放状态和时间轴，但只渲染一个画布
    console.log("触发全屏预览");
    setIsFullscreen(true);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    // 退出全屏，继续在主画布播放
    console.log("关闭全屏预览");
    setIsFullscreen(false);
  }, []);

  // 画布比例菜单
  const resizeMenuItems = [
    {
      key: "16:9",
      label: (
        <div className="flex items-center justify-between w-48">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 border border-gray-400 rounded">
              <div className="w-4 h-2 bg-gray-300"></div>
            </div>
            <span>{t("canvas.ratio169")}</span>
          </div>
          <span className="text-xs text-gray-500">{t("canvas.youtube")}</span>
        </div>
      ),
      onClick: () => handleResizeChange("16:9"),
    },
    {
      key: "9:16",
      label: (
        <div className="flex items-center justify-between w-48">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 border border-gray-400 rounded">
              <div className="w-2 h-4 bg-gray-300"></div>
            </div>
            <span>{t("canvas.ratio916")}</span>
          </div>
          <span className="text-xs text-gray-500">{t("canvas.tiktok")}</span>
        </div>
      ),
      onClick: () => handleResizeChange("9:16"),
    },
    {
      key: "1:1",
      label: (
        <div className="flex items-center justify-between w-48">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 border border-gray-400 rounded">
              <div className="w-3 h-3 bg-gray-300"></div>
            </div>
            <span>{t("canvas.ratio11")}</span>
          </div>
          <span className="text-xs text-gray-500">{t("canvas.instagram")}</span>
        </div>
      ),
      onClick: () => handleResizeChange("1:1"),
    },
  ];
  
  return (
    <div className="flex flex-col h-[800px] bg-gray-50">
      {/* 顶部标题栏 */}
      <TopBar
        anchorRef={anchorRef}
        nodeType={nodeType}
        canUndo={canUndo}
        canRedo={canRedo}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        canvasRatio={canvasRatio}
        ratioPopoverVisible={ratioPopoverVisible}
        setRatioPopoverVisible={setRatioPopoverVisible}
        resizeMenuItems={resizeMenuItems}
        handleRatioMenuItemClick={handleRatioMenuItemClick}
        exportOps={exportOps}
        handleCloseClick={handleCloseClick}
        handleSyncDataClick={handleSyncDataClick}
      />

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <PanelGroup direction="vertical">
            <Panel defaultSize={65} minSize={30}>
              <div className="flex h-full overflow-hidden">
                <div className="flex">
                  <Toolbar
                    activePanel={activePanel}
                    onPanelChange={setActivePanel}
                  />
                  <LeftPanel
                    activePanel={activePanel}
                    mediaItems={mediaItems}
                    onMediaAdd={clipOps.handleMediaAdd}
                    onMediaRemove={clipOps.handleMediaRemove}
                    onAddToTimeline={clipOps.handleClipAdd}
                    onMediaAndClipAdd={clipOps.handleMediaAndClipAdd}
                    existingClips={clips}
                    currentTime={currentTime}
                    nodeId={nodeId}
                    isSyncing={isSyncing}
                  />
                </div>

                <div className="flex-1 overflow-hidden">
                  {/* 全屏时隐藏主预览画布 */}
                  <div
                    style={{
                      display: isFullscreen ? "none" : "block",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <PreviewCanvas
                      currentTime={currentTime}
                      clips={clips}
                      mediaItems={mediaItems}
                      isPlaying={isPlaying}
                      canvasRatio={canvasRatio}
                      selectedClipId={selectedClipId}
                      onClipUpdate={clipOps.handleClipUpdate}
                      onClipSelect={setSelectedClipId}
                      forceUpdateTextRef={forceUpdateTextRef}
                      isFullscreen={false}
                    />
                  </div>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="bg-gray-300 hover:bg-blue-400 cursor-row-resize" />

            <Panel defaultSize={30} minSize={20}>
              <div className="flex flex-col h-full">
                <PlaybackControls
                  currentTime={currentTime}
                  duration={actualDuration}
                  isPlaying={isPlaying}
                  scale={scale}
                  selectedClipId={selectedClipId}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onTimeChange={playbackControl.handleTimeChange}
                  onPlayPause={playbackControl.handlePlayPause}
                  onScaleChange={setScale}
                  onCopyClip={clipOps.handleCopyClip}
                  onSplitClip={clipOps.handleSplitClip}
                  onSplitLeft={clipOps.handleSplitLeft}
                  onSplitRight={clipOps.handleSplitRight}
                  onDeleteClip={clipOps.handleDeleteClip}
                  onReset={handleReset}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onFullscreen={handleFullscreen}
                />

                <div
                  className="flex-1 overflow-hidden"
                  onClick={handleTimelineClick}
                >
                  <TimelineEditor
                    clips={clips}
                    mediaItems={mediaItems}
                    currentTime={currentTime}
                    duration={actualDuration}
                    scale={scale}
                    selectedClipId={selectedClipId}
                    reactflowScale={reactflowScale}
                    onClipUpdate={clipOps.handleClipUpdate}
                    onBatchClipsUpdate={handleBatchClipsUpdate}
                    onClipRemove={clipOps.handleClipRemove}
                    onClipResize={clipOps.handleClipResize}
                    onClipResizeEnd={clipOps.handleClipResizeEnd}
                    onTimeChange={playbackControl.handleTimeChange}
                    onScaleChange={setScale}
                    onClipSelect={setSelectedClipId}
                    onCursorDragStart={playbackControl.handleCursorDragStart}
                    onCursorDragEnd={playbackControl.handleCursorDragEnd}
                    onTracksRemapped={handleTracksRemapped}
                    onDragStart={() => console.log("开始拖拽片段")}
                    onDragEnd={() => console.log("结束拖拽片段")}
                  />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>

        <RightPanel
          selectedClip={selectedClip}
          mediaItems={mediaItems}
          onClipUpdate={clipOps.handleClipUpdate}
          onClipDeselect={() => setSelectedClipId(null)}
        />
      </div>

      {/* 导出进度 Modal */}
      <ExportProgressModal
        nodeId={nodeId}
        isExporting={exportOps.isExporting}
        exportProgress={exportOps.exportProgress}
        exportComplete={exportOps.exportComplete}
        exportedFormat={exportOps.exportedFormat}
        setIsExporting={exportOps.setIsExporting}
        setExportProgress={exportOps.setExportProgress}
        setExportComplete={exportOps.setExportComplete}
        setExportedBlob={exportOps.setExportedBlob}
        handleDownload={exportOps.handleDownload}
        handleCancelExport={exportOps.handleCancelExport}
      />

      {/* 全屏预览 Modal */}
      <FullscreenPreview
        visible={isFullscreen}
        currentTime={currentTime}
        clips={clips}
        mediaItems={mediaItems}
        isPlaying={isPlaying}
        canvasRatio={canvasRatio}
        onClose={handleCloseFullscreen}
        onPlayPause={playbackControl.handlePlayPause}
        onTimeChange={playbackControl.handleTimeChange}
      />
    </div>
  );
};

export default VideoEditor;
