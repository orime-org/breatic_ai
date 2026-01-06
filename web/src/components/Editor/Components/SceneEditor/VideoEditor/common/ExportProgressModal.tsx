import React from "react";
import { Modal, Button } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { LoadingDots } from "./LoadingDots";

interface ExportProgressModalProps {
  // 节点ID
  nodeId: string;

  // 导出状态
  isExporting: boolean;
  exportProgress: number;
  exportComplete: boolean;
  exportedFormat: string;

  // 状态设置函数
  setIsExporting: (value: boolean) => void;
  setExportProgress: (value: number) => void;
  setExportComplete: (value: boolean) => void;
  setExportedBlob: (value: Blob | null) => void;

  // 回调函数
  handleDownload: () => void;
  handleCancelExport?: () => void; // 取消导出的回调
}

/**
 * 导出进度 Modal 组件
 *
 * 显示导出进度或导出完成状态，包括：
 *
 * 导出中状态：
 * - 进度百分比（大号显示）
 * - "导出中" 文字 + 动画点
 * - 进度提示文字
 *
 * 导出完成状态：
 * - 完成图标
 * - 成功提示文字
 * - 格式提示（图片/音频/视频）
 * - 下载按钮
 *
 * 功能：
 * - 导出中可以取消（显示确认对话框）
 * - 导出完成可以直接关闭
 * - 点击下载按钮触发文件下载
 */
export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  nodeId,
  isExporting,
  exportProgress,
  exportComplete,
  exportedFormat,
  setIsExporting,
  setExportProgress,
  setExportComplete,
  setExportedBlob,
  handleDownload,
  handleCancelExport,
}) => {
  const { t } = useTranslation();

  /**
   * 处理 Modal 关闭事件
   * - 导出完成：直接关闭并重置状态
   * - 导出中：显示确认对话框
   */
  const handleCancel = () => {
    if (exportComplete) {
      // 下载页面：直接关闭
      setIsExporting(false);
      setExportProgress(0);
      setExportComplete(false);
      setExportedBlob(null);
    } else {
      // 导出中：显示确认对话框
      Modal.confirm({
        title: t("export.cancelTitle"),
        content: t("export.cancelMessage"),
        okText: t("common.confirm"),
        cancelText: t("common.cancel"),
        zIndex: 10000,
        okButtonProps: {
          className: "bg-black border-black hover:bg-gray-800",
        },
        onOk: () => {
          // 调用取消导出回调，真正中止导出进程
          if (handleCancelExport) {
            handleCancelExport();
          } else {
            // 兜底：重置导出状态
            setIsExporting(false);
            setExportProgress(0);
            setExportComplete(false);
            setExportedBlob(null);
          }
        },
      });
    }
  };

  /**
   * 获取导出格式提示文字
   */
  const getFormatMessage = () => {
    if (exportedFormat === "PNG" || exportedFormat === "JPG") {
      return t("export.exportingImage");
    } else if (exportedFormat === "AUDIO") {
      return t("export.exportingAudio");
    } else {
      return t("export.exportingVideo");
    }
  };

  return (
    <Modal
      title={t("export.download")}
      open={isExporting}
      onCancel={handleCancel}
      footer={null}
      closable={true}
      width={700}
      centered
      zIndex={9999}
      getContainer={() => document.getElementById(`video-editor-root-${nodeId}`) || document.body}
      rootClassName="video-editor-modal"
    >
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: "400px" }}
      >
        {exportComplete ? (
          // 导出完成状态
          <>
            <CheckCircleOutlined className="mb-2 text-2xl" />
            <div className="mb-2 text-lg text-gray-900">
              {t("export.success")}
            </div>
            <div className="mb-8 text-sm text-gray-500">
              {getFormatMessage()}
            </div>
            <Button
              type="primary"
              size="large"
              className="w-24 bg-black border-black hover:bg-gray-800"
              onClick={handleDownload}
            >
              {t("export.download")}
            </Button>
          </>
        ) : (
          // 导出中状态
          <>
            <div className="mb-6 text-6xl font-bold text-gray-900">
              {exportProgress}%
            </div>
            <div className="mb-2 text-lg text-gray-900">
              {t("export.exporting")}
              <LoadingDots />
            </div>
            <div className="text-sm text-gray-500">{t("export.progress")}</div>
          </>
        )}
      </div>
    </Modal>
  );
};
