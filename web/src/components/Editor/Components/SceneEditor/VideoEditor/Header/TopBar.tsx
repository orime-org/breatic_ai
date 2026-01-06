import React, { useEffect, useState, RefObject } from "react";
import { Button, Popover, Tooltip } from "antd";
import {
  BorderOutlined,
  DownloadOutlined,
  // CloseOutlined,
  ArrowLeftOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../LanguageSwitcher";
import { ExportPanel } from "../Controls/ExportPanel";
import useStore from "../../../../Store/store";
import { EditorNodes_TooltipSvg } from "../../../../SvgLoader/staticIcon";
import { NodeTemplateDetail, CONTROL_TAG } from "../../../../Types/types";
import { tipsType } from "../../../../Types/nodeControlType";
import { NodeTemplateType } from "../../../../Dict/dict";

interface TopBarProps {
  // 锚点Ref
  anchorRef: RefObject<HTMLDivElement | null>;

  // 节点类型
  nodeType: NodeTemplateType;

  // 撤销/重做
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;

  // 画布尺寸调整
  canvasRatio: string;
  ratioPopoverVisible: boolean;
  setRatioPopoverVisible: (visible: boolean) => void;
  resizeMenuItems: Array<{
    key: string;
    label: React.ReactNode;
    onClick: () => void;
  }>;
  handleRatioMenuItemClick: (onClick: () => void) => void;

  // 导出功能
  exportOps: {
    exportType: string;
    setExportType: (type: string) => void;
    videoFormat: string;
    setVideoFormat: (format: string) => void;
    imageFormat: string;
    setImageFormat: (format: string) => void;
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
    audioExportFormat: string;
    setAudioExportFormat: (format: string) => void;
    audioExportBitrate: string;
    setAudioExportBitrate: (bitrate: string) => void;
    audioExportSampleRate: number;
    setAudioExportSampleRate: (rate: number) => void;
    exportPopoverVisible: boolean;
    setExportPopoverVisible: (visible: boolean) => void;
    handleExportConfirm: () => void;
  };

  // 关闭
  handleCloseClick: () => void;
  // 同步数据
  handleSyncDataClick: () => void;
}

/**
 * 顶部标题栏组件
 *
 * 包含以下功能：
 * - 左侧返回按钮
 * - 应用标题（居中显示）
 * - 语言切换器
 * - 画布尺寸调整
 * - 导出功能
 * - 右侧关闭按钮
 */
export const TopBar: React.FC<TopBarProps> = ({ anchorRef, nodeType, canUndo, canRedo, handleUndo, handleRedo, canvasRatio, ratioPopoverVisible, setRatioPopoverVisible, resizeMenuItems, handleRatioMenuItemClick, exportOps, handleCloseClick, handleSyncDataClick }) => {
  const { t } = useTranslation();

  // 获取 Audio Input 的模版静态数据
  const nodeTemplateData = useStore.getState().nodeTemplateData?.find((item) => item.template_code === Number(nodeType)) || ({} as NodeTemplateDetail);
  const tipsData = nodeTemplateData?.content?.[CONTROL_TAG.TIPS] || {};
  const [tips, setTips] = useState<tipsType>({ content: "", items: [] });

  // 初始化节点运行时数据
  useEffect(() => {
    setTips(tipsData);
  }, [tipsData]);

  return (
    <div className="relative flex items-center px-2 bg-white border-b border-gray-300" style={{ height: "44px" }}>
      {/* 左侧同步数据按钮和文字 */}
      <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Sync data from upstream to your Video Editor</div>} mouseEnterDelay={0.1} classNames={{ container: "node-workflow-tooltip-container" }}>
        <div className="flex items-center gap-2 px-2 py-1 transition-colors cursor-pointer hover:bg-gray-100" style={{ borderRadius: "4px" }} onClick={handleSyncDataClick}>
          <SyncOutlined className="text-gray-600 " style={{ fontSize: "12px" }} />
          <span className="text-gray-600" style={{ fontSize: "12px" }}>
            {t("common.syncData")}
          </span>
        </div>
      </Tooltip>

      {/* 撤销和重做按钮已注释 */}
      {/* <div className="flex items-center gap-3">
        <img
          src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/return.png")}
          alt={t("common.previous")}
          className={`w-4 h-4 cursor-pointer transition-opacity ${
            canUndo ? "hover:opacity-70" : "opacity-30 cursor-not-allowed"
          }`}
          onClick={canUndo ? handleUndo : undefined}
        />
        <img
          src={require("../../../../../../../assets/images/pages/editor/sceneEditor/videoEditor/go-on.png")}
          alt={t("common.next")}
          className={`w-4 h-4 ml-4 cursor-pointer transition-opacity ${
            canRedo ? "hover:opacity-70" : "opacity-30 cursor-not-allowed"
          }`}
          onClick={canRedo ? handleRedo : undefined}
        />
      </div> */}

      {/* 应用标题 - 居中显示 */}
      <div className="absolute transform -translate-x-1/2 left-1/2" style={{ color: "#71717a", fontSize: "14px" }}>
        {t("common.appTitle")}
      </div>

      {/* 右侧功能按钮区域 */}
      <div className="flex items-center ml-auto" style={{ gap: "10px" }}>
        {/* 语言切换器 */}
        {/* <LanguageSwitcher /> */}

        {/* 画布尺寸调整 */}
        <Popover
          content={
            <div className="mt-2">
              {resizeMenuItems.map((item) => (
                <div key={item.key} className="py-2 cursor-pointer hover:bg-gray-100" style={{ fontSize: "12px" }} onClick={() => handleRatioMenuItemClick(item.onClick)}>
                  {item.label}
                </div>
              ))}
            </div>
          }
          trigger="click"
          open={ratioPopoverVisible}
          onOpenChange={setRatioPopoverVisible}
          placement="bottomRight"
        >
          <Button size="small" icon={<BorderOutlined />} style={{ height: "26px", fontSize: "12px", borderRadius: "4px" }}>
            {canvasRatio}
          </Button>
        </Popover>

        {/* 导出功能 */}
        <Popover
          content={
            <ExportPanel
              exportType={exportOps.exportType}
              setExportType={exportOps.setExportType}
              videoFormat={exportOps.videoFormat}
              setVideoFormat={exportOps.setVideoFormat}
              imageFormat={exportOps.imageFormat}
              setImageFormat={exportOps.setImageFormat}
              canvasRatio={canvasRatio}
              exportResolution={exportOps.exportResolution}
              setExportResolution={exportOps.setExportResolution}
              exportFrameRate={exportOps.exportFrameRate}
              setExportFrameRate={exportOps.setExportFrameRate}
              exportBitrate={exportOps.exportBitrate}
              setExportBitrate={exportOps.setExportBitrate}
              exportBitrateMode={exportOps.exportBitrateMode}
              setExportBitrateMode={exportOps.setExportBitrateMode}
              exportCustomBitrate={exportOps.exportCustomBitrate}
              setExportCustomBitrate={exportOps.setExportCustomBitrate}
              exportCodec={exportOps.exportCodec}
              setExportCodec={exportOps.setExportCodec}
              exportAudioSampleRate={exportOps.exportAudioSampleRate}
              setExportAudioSampleRate={exportOps.setExportAudioSampleRate}
              exportAudioQuality={exportOps.exportAudioQuality}
              setExportAudioQuality={exportOps.setExportAudioQuality}
              audioExportFormat={exportOps.audioExportFormat}
              setAudioExportFormat={exportOps.setAudioExportFormat}
              audioExportBitrate={exportOps.audioExportBitrate}
              setAudioExportBitrate={exportOps.setAudioExportBitrate}
              audioExportSampleRate={exportOps.audioExportSampleRate}
              setAudioExportSampleRate={exportOps.setAudioExportSampleRate}
              onExport={exportOps.handleExportConfirm}
            />
          }
          trigger="click"
          open={exportOps.exportPopoverVisible}
          onOpenChange={exportOps.setExportPopoverVisible}
          placement="bottomRight"
        >
          <Button icon={<DownloadOutlined />} className="text-white bg-black border-black" style={{ height: "26px", fontSize: "12px", borderRadius: "4px" }}>
            {t("common.export")}
          </Button>
        </Popover>

        {/* Tips Section */}
        <div className="w-[26px] h-[26px] flex items-center justify-center">
          <Tooltip
            title={
              <div className="inline-block whitespace-nowrap max-w-none p-[10px]">
                <div className="text-[12px]">{tips?.content || ""}</div>
                {tips?.items?.map((item: string, index: number) => (
                  <div key={index} className="flex items-center text-[10px]">
                    <br />
                    {item || ""}
                  </div>
                ))}
              </div>
            }
            mouseEnterDelay={0.1}
            getPopupContainer={() => anchorRef.current!}
          >
            <span className="inline-flex items-center cursor-pointer justify-center pointer-events-auto p-4">
              <EditorNodes_TooltipSvg />
            </span>
          </Tooltip>
        </div>

        {/* 关闭按钮 */}
        {/* <div
          className="flex items-center justify-center transition-colors bg-white border border-gray-300 rounded-full cursor-pointer hover:border-gray-400"
          style={{ width: "26px", height: "26px" }}
          onClick={handleCloseClick}
        >
          <CloseOutlined className="text-xs text-gray-600" />
        </div> */}
      </div>
    </div>
  );
};
