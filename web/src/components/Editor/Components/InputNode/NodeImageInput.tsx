/**
 * 图片输入(image input) 数据节点组件
 */
import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import { Handle, Position, NodeResizer as _NodeResizer } from "@xyflow/react";
import { App, Image, Tooltip } from "antd";
import { BlockMeta, getNodeModelsByType, NodeTemplateType, HandleIsMulti } from "../../Dict/dict";
import useStore from "../../Store/store";
import { NodeImageInputRuntimeData, selectedResultInfo, SelectedResultsType } from "../../Types/runtimeData";
import editorApi from "../../../../api/editorApi";
import { CONTROL_TAG, NODE_EXECUTE_STATUS_CODE, NodeTemplateDetail } from "../../Types/types";
import NodeToolbarManager from "../Common/NodeToolbarManager";
import { Node_HandleSvg, EditorNodes_TooltipSvg, NodeImageInput_ImageUploadSvg, EditorNodes_ImageClose_Svg, EditorNodes_UploadingSpinAnimation_SVG } from "../../SvgLoader/staticIcon";
import { tipsType } from "../../Types/nodeControlType";
import { getNodeIcon } from "../../SvgLoader/nodeIcon";

const COMPONMENT_TITLE = "Image";
function NodeImageInput({ id, type, selected }: { id: string; type: NodeTemplateType; selected?: boolean }) {
  const setNodeRuntimeData = useStore((s) => s.setNodeRuntimeData);
  const setNodeSelectedResultData = useStore((s) => s.setNodeSelectedResultData);
  const setNodeRuntimeDataByKey = useStore((s) => s.setNodeRuntimeDataByKey);
  // 获取 Text Input 的模版静态数据
  const nodeTemplateData = useStore.getState().nodeTemplateData?.find((item) => item.template_code === Number(type)) || ({} as NodeTemplateDetail);

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const hideToolbarTimerRef = useRef<number | null>(null);
  const [isTitleEditable, setIsTitleEditable] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const lastCaretPosRef = useRef<number>(0);
  const [title, setTitle] = useState<string>(COMPONMENT_TITLE);
  const { message: messageApi } = App.useApp();
  const [tips, setTips] = useState<tipsType>({ content: "", items: [] });
  const tipsData = nodeTemplateData?.content?.[CONTROL_TAG.TIPS] || {};
  const InputNodeModel = getNodeModelsByType(type);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageHovered, setIsImageHovered] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  // 初始化节点运行时数据
  useEffect(() => {
    setTips(tipsData);
  }, [tipsData]);

  useEffect(() => {
    const nodeRuntimeData = useStore.getState().nodeRuntimeData?.[id];
    if (!nodeRuntimeData) {
      // 新建空节点数据初始化
      const currentNodeRuntimeData: NodeImageInputRuntimeData = {
        imageUrl: "",
        uploadSuccess: false,
        title: COMPONMENT_TITLE,
      };
      setNodeRuntimeData(id, currentNodeRuntimeData);

      const currentNodeSelectedResultData = {
        counter: 0,
        selectedResultsType: SelectedResultsType.URL,
        selectedResults: [""],
      } as selectedResultInfo;
      setNodeSelectedResultData(id, currentNodeSelectedResultData);
    } else {
      setTimeout(() => {
        setPreviewUrl(nodeRuntimeData.imageUrl);
        setUploadSuccess(nodeRuntimeData.uploadSuccess);
        setTitle(nodeRuntimeData.title);
      }, 0); // 延迟恢复，规避 resizeObserverErrors
    }

    // 清理工具栏延迟定时器
    return () => {
      if (hideToolbarTimerRef.current) {
        clearTimeout(hideToolbarTimerRef.current);
        hideToolbarTimerRef.current = null;
      }
    };
  }, []);

  // ResizeObserver 错误处理 - 增强版
  useEffect(() => {
    const handleResizeObserverError = (event: ErrorEvent) => {
      // 检查多种可能的 ResizeObserver 错误消息
      const resizeObserverErrors = ["ResizeObserver loop completed with undelivered notifications", "ResizeObserver loop limit exceeded", "Script error"];

      const isResizeObserverError = resizeObserverErrors.some((errorMsg) => event.message && event.message.includes(errorMsg));

      if (isResizeObserverError) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
      }
      return false;
    };

    /**
     * 处理未捕获的 Promise 拒绝事件
     */
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === "string" && event.reason.includes("ResizeObserver")) {
        event.preventDefault();
        return true;
      }
      return false;
    };

    // 添加多种错误监听器
    window.addEventListener("error", handleResizeObserverError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      window.removeEventListener("error", handleResizeObserverError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  /**
   * 处理删除上传文件
   */
  const handleRemove = useCallback(() => {
    setUploading(false);
    setUploadSuccess(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    // 重置节点数据
    const currentNodeRuntimeData: NodeImageInputRuntimeData = {
      imageUrl: "",
      uploadSuccess: false,
      title: title,
    };
    setNodeRuntimeData(id, currentNodeRuntimeData);

    setNodeSelectedResultData(id, {
      counter: 0,
      selectedResultsType: SelectedResultsType.URL,
      selectedResults: [""],
    });
  }, [id, previewUrl, title]);

  /**
   * 处理文件上传
   */
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadSuccess(false);

      // 创建本地预览
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(localPreviewUrl);

      const formData = new FormData();
      formData.append("file", file);

      const workflowId = useStore.getState().workflowInfo.id,
        updateToken = useStore.getState().updateToken;
      const response = await editorApi.uploadFile(`/api/workflow/node/upload_form?workflow_id=${workflowId}&update_token=${updateToken}`, formData);

      if (response?.result?.code === NODE_EXECUTE_STATUS_CODE.SUCCESS) {
        const url = response?.result?.data || "";

        // 释放本地预览URL，使用服务器URL
        URL.revokeObjectURL(localPreviewUrl);
        setPreviewUrl(url);

        // 更新节点数据
        const runtimeData: NodeImageInputRuntimeData = {
          imageUrl: url,
          uploadSuccess: true,
          title,
        };
        const selectedResultData = {
          counter: 1,
          selectedResultsType: SelectedResultsType.URL,
          selectedResults: [url],
        };

        setNodeRuntimeData(id, runtimeData);
        setNodeSelectedResultData(id, selectedResultData);
        setUploadSuccess(true);
      } else {
        throw new Error(response?.result?.message || "File upload failed");
      }
    } catch (err) {
      messageApi.error("Image upload failed.");
      // 上传失败时清理预览
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }
    } finally {
      setUploading(false);
    }
  };

  /**
   * 处理标题改变事件
   * @param e 输入事件
   */
  const handleTitleChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    setTitle(value);
    setNodeRuntimeDataByKey(id, "title", value);
  };

  /**
   * 处理文件选择
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 文件验证
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      messageApi.error("The image file size cannot exceed 10 MB!");
      return;
    }

    handleFileUpload(file);

    // 重置input，允许选择同一个文件再次上传
    event.target.value = "";
  };

  /**
   * 处理拖拽事件
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 可以在这里添加拖拽状态的视觉反馈
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 移除拖拽状态的视觉反馈
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      handleFileUpload(file);
    }
  };

  return (
    <div ref={anchorRef} className={`w-[300px] z-index-100 flex flex-col rounded-[5px] cursor-default bg-white outline outline-2 ${selected ? " outline-solid" : isHovered ? " outline-dotted" : " outline-solid"} ${selected || isHovered ? " outline-[#0D99FF]" : " outline-[#E9E9E9]"}`}>
      <div
        className="relative"
        onMouseEnter={() => {
          if (hideToolbarTimerRef.current) {
            clearTimeout(hideToolbarTimerRef.current);
            hideToolbarTimerRef.current = null;
          }
          setIsHovered(true);
        }}
        onMouseLeave={(e) => {
          const target = e.relatedTarget as EventTarget | null;
          const enteringToolbar = !!(toolbarRef.current && target && target instanceof Node && toolbarRef.current.contains(target));

          if (enteringToolbar) {
            setIsToolbarHovered(true);
            setIsHovered(false);
            return;
          }
          if (hideToolbarTimerRef.current) {
            clearTimeout(hideToolbarTimerRef.current);
          }
          hideToolbarTimerRef.current = window.setTimeout(() => {
            setIsHovered(false);
            setIsToolbarHovered(false);
          }, 150);
        }}
      >
        {/* 节点工具栏 */}
        {(isHovered || isToolbarHovered || !!selected) && (
          <NodeToolbarManager
            id={id}
            type={type}
            toolbarRef={toolbarRef}
            onToolbarMouseEnter={() => {
              if (hideToolbarTimerRef.current) {
                clearTimeout(hideToolbarTimerRef.current);
                hideToolbarTimerRef.current = null;
              }
              setIsToolbarHovered(true);
            }}
            onToolbarMouseLeave={() => {
              if (hideToolbarTimerRef.current) {
                clearTimeout(hideToolbarTimerRef.current);
              }
              hideToolbarTimerRef.current = window.setTimeout(() => {
                setIsToolbarHovered(false);
              }, 150);
            }}
          />
        )}

        {/* 节点主体部分 */}
        <div className="relative border-0 box-border outline-0 relative">
          {/* 标题 */}
          <div className="flex1 h-[44px] flex items-center hover:cursor-grab active:cursor-grabbing">
            {/* 图标 */}
            <div className="w-[35px] h-full flex items-center justify-center pl-3 mt-[1px] text-op-text-1">{getNodeIcon(nodeTemplateData.template_icon, "w-[20px] h-[20px]")}</div>
            <input
              ref={titleInputRef}
              className={`max-w-fulls w-[180px] truncate text-[12px] font-bold text-op-text-1 bg-transparent outline-0 border-0 pl-[10px] ${isTitleEditable ? "nodrag select-text" : "hover:cursor-grab active:cursor-grabbing select-none"}`}
              type="text"
              value={title}
              readOnly={!isTitleEditable}
              onClick={(e) => {
                const input = e.target as HTMLInputElement;
                lastCaretPosRef.current = input.selectionStart ?? 0;
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsTitleEditable(true);
                requestAnimationFrame(() => {
                  const input = titleInputRef.current;
                  if (input) {
                    const pos = input.selectionStart ?? lastCaretPosRef.current ?? input.value.length;
                    input.focus();
                    input.setSelectionRange(pos, pos);
                  }
                });
              }}
              onBlur={() => setIsTitleEditable(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onChange={handleTitleChangeEvent}
            />

            {/* Tips Section */}
            <div className="ml-auto w-[16px] h-[19px] mr-[11px] flex items-center justify-center">
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
          </div>

          {/* 分割线 */}
          <div className="w-full border-b bg-[#E9E9E9]" />

          {/* 子内容 */}
          <div className="content-container h-auto flex flex-col shadow-none bd-white rounded-b-[5px]">
            <div className="relative min-auto w-full overflow-visible space-y-4 p-1 bg-white rounded-b-[5px]">
              {uploading ? (
                // 1 上传中……
                <div className="w-full h-[197px] flex flex-col items-center justify-center text-center">
                  <EditorNodes_UploadingSpinAnimation_SVG color="#35C838"/>
                  <p className="text-sm font-medium text-[#35C838] mt-2 mb-2">Uploading...</p>
                </div>
              ) : uploadSuccess && previewUrl ? (
                // 2 上传成功，显示预览图片
                <div
                  className="w-full group min-h-[187px] flex flex-col items-center justify-center relative bg-[#F3F3F3]"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <Image
                    src={previewUrl}
                    className="block w-full h-auto object-contain"
                    loading="lazy"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  />
                  <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Remove</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                    <div
                      className={`absolute top-1 right-1 flex items-center justify-center h-[24px] w-[24px] rounded-[3px] ${
                        isImageHovered ? " outline outline-1 outline-[#000000]" : " outline outline-1 outline-[#989898]"
                      } bg-[#FFFFFF] !p-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove();
                      }}
                      onMouseEnter={() => setIsImageHovered(true)}
                      onMouseLeave={() => setIsImageHovered(false)}
                    >
                      <EditorNodes_ImageClose_Svg className="block" color={isImageHovered ? "#262626" : "#989898"} />
                    </div>
                  </Tooltip>
                </div>
              ) : (
                // 3 上传失败或未上传，显示上传按钮
                <div className="w-full min-h-[197px] flex flex-col items-center justify-center text-center rounded-md cursor-pointer" onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".png,.jpg,.jpeg" onChange={handleFileSelect} />
                  <NodeImageInput_ImageUploadSvg />
                  <div className="mt-[10px]">
                    <p className="text-xs font-normal text-[#989898]">Click to select an image file</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Handle连接点 - 右侧输出 */}
          {InputNodeModel?.handle?.target?.map((item, index) => {
            const outputHandleType = item.key;
            const handleColor = outputHandleType ? BlockMeta[outputHandleType]?.color ?? "#000" : "#000";
            const handleCounter = useStore.getState().nodeSelectedResultData?.[id]?.counter;

            return (
              <div key={`${id}-handleTarget-${index}`} className="absolute -right-[54px] w-[52px] top-[45px] h-[36px] flex flex-col justify-center">
                <div className="relative flex flex-col items-center w-[52px]">
                  <div className="flex flex-col items-center relative">
                    <Handle type="source" position={Position.Right} id={`${outputHandleType}_${index}_${item.isMulti}`} className="!absolute !w-[36px] !h-[36px] !-translate-y-1/2 !border-none !rounded-full !z-[99] !opacity-0 !pointer-events-auto !transition-colors !duration-200" />
                    <div className="flex flex-col items-center justify-center min-h-[36px]">
                      <div className="relative">
                        <Node_HandleSvg color={handleColor} isEmpty={handleCounter <= 0} isLeft={false} />
                        <div className="absolute inset-0 flex items-center justify-end z-[2] pointer-events-none">
                          <div className={`flex items-center justify-center w-[36px] font-normal text-white ${handleCounter > 0 ? "text-xs" : "text-[10px]"}`}>
                            <span>{handleCounter > 0 ? "1" : item.key}</span>
                            <span>{item.isMulti !== HandleIsMulti.MULTI ? "" : "s"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(NodeImageInput);
