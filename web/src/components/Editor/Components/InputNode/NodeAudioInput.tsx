/**
 * 音频输入（audio input）数据节点组件
 * 主要功能：
 * 1、提交并加载用户输入的在线音频源；
 * 2、录制音频，提交、加载音频；
 * 3、本地的音频文件，提交、加载音频；
 */
import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import { Handle, Position, NodeResizer as _NodeResizer } from "@xyflow/react";
import { Input, Button, App, Tooltip } from "antd";
import { getNodeModelsByType, NodeTemplateType, BlockMeta, HandleIsMulti } from "../../Dict/dict";
import useStore from "../../Store/store";
import editorApi from "../../../../api/editorApi";
import { CONTROL_TAG, NODE_EXECUTE_STATUS_CODE, NodeTemplateDetail } from "../../Types/types";
import { NodeAudioInputRuntimeData, selectedResultInfo, SelectedResultsType } from "../../Types/runtimeData";
import { getNodeIcon } from "../../SvgLoader/nodeIcon";
import { tipsType } from "../../Types/nodeControlType";
import NodeToolbarManager from "../Common/NodeToolbarManager";
import { EditorNodes_TooltipSvg, Node_HandleSvg, NodeImageInput_ImageUploadSvg, EditorNodes_NodeAudioInput_Remove_Svg, EditorNodes_NodeAudioInput_Record_Svg, EditorNodes_UploadingSpinAnimation_SVG } from "../../SvgLoader/staticIcon";

const COMPONMENT_TITLE = "Audio";
function NodeAudioInput({ id, type, selected }: { id: string; type: NodeTemplateType; selected: boolean }) {
  const setNodeRuntimeData = useStore((s) => s.setNodeRuntimeData);
  const setNodeSelectedResultData = useStore((s) => s.setNodeSelectedResultData);
  const setNodeRuntimeDataByKey = useStore((s) => s.setNodeRuntimeDataByKey);
  // 获取 Audio Input 的模版静态数据
  const nodeTemplateData = useStore.getState().nodeTemplateData?.find((item) => item.template_code === Number(type)) || ({} as NodeTemplateDetail);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { message: messageApi } = App.useApp();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const hideToolbarTimerRef = useRef<number | null>(null);
  const [isTitleEditable, setIsTitleEditable] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const lastCaretPosRef = useRef<number>(0);
  const [title, setTitle] = useState<string>(COMPONMENT_TITLE);
  const [tips, setTips] = useState<tipsType>({ content: "", items: [] });
  const tipsData = nodeTemplateData?.content?.[CONTROL_TAG.TIPS] || {};
  const InputNodeModel = getNodeModelsByType(type);
  const [isRemoveBtnHovered, setIsRemoveBtnHovered] = useState(false);
  const [isRecordingBtnHovered, setIsRecordingBtnHovered] = useState(false);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // 初始化节点运行时数据
  useEffect(() => {
    setTips(tipsData);
  }, [tipsData]);

  // 初始化节点运行时数据
  useEffect(() => {
    const nodeRuntimeData = useStore.getState().nodeRuntimeData?.[id];
    if (!nodeRuntimeData) {
      const currentNodeRuntimeData: NodeAudioInputRuntimeData = {
        inputValue: "",
        audioUrl: "",
        title: title,
      };
      setNodeRuntimeData(id, currentNodeRuntimeData);

      const currentNodeSelectedResultData = {
        counter: 0,
        selectedResultsType: SelectedResultsType.URL,
        selectedResults: [""],
      } as selectedResultInfo;
      setNodeSelectedResultData(id, currentNodeSelectedResultData);
    } else {
      if (nodeRuntimeData?.audioUrl && nodeRuntimeData?.audioUrl?.length > 0) {
        setUploadSuccess(true);
        setTimeout(() => {
          setPreviewUrl(nodeRuntimeData.audioUrl);
        }, 0); // 延时，规避 handleResizeObserverError
      }

      setInputValue(nodeRuntimeData?.inputValue || "");
      setTitle(nodeRuntimeData?.title || COMPONMENT_TITLE);
    }
  }, []);

  // ResizeObserver 错误处理
  useEffect(() => {
    const handleResizeObserverError = (event: ErrorEvent) => {
      if (event.message && event.message.includes("ResizeObserver loop completed with undelivered notifications")) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    // 添加错误监听器
    window.addEventListener("error", handleResizeObserverError);

    return () => {
      window.removeEventListener("error", handleResizeObserverError);
    };
  }, []);

  /**
   * 处理删除上传文件
   */
  const handleRemove = useCallback(() => {
    setUploading(false);
    setUploadSuccess(false);
    setInputValue("");

    if (previewUrl) {
      setPreviewUrl("");
      const currentNodeSelectedResultData = {
        counter: 0,
        selectedResultsType: SelectedResultsType.URL,
        selectedResults: [""],
      } as selectedResultInfo;
      setNodeSelectedResultData(id, currentNodeSelectedResultData);
      setNodeRuntimeDataByKey(id, "audioUrl", "");
      setNodeRuntimeDataByKey(id, "inputValue", "");
    }
  }, [id, previewUrl]);

  /**
   * 处理输入框值变化
   */
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setNodeRuntimeDataByKey(id, "inputValue", value);
  }, []);

  /**
   * 处理录音按钮点击
   */
  const MAX_DURATION = 60 * 1000;
  const handleRecordClick = useCallback(async () => {
    if (isRecording) {
      // 用户主动停止
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      setIsRecording(false);

      // 清理计时器
      if (recordTimerRef.current) {
        clearTimeout(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    } else {
      // 开始录音前初始化状态
      setUploading(true);
      setUploadSuccess(false);
      setPreviewUrl("");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };

        recorder.onstop = () => {
          // onstop 时清理倒计时
          if (recordTimerRef.current) {
            clearTimeout(recordTimerRef.current);
            recordTimerRef.current = null;
          }

          const blob = new Blob(chunks, { type: "audio/wav" });
          const file = new File([blob], `recording-${Date.now()}.wav`, { type: "audio/wav" });

          const formData = new FormData();
          formData.append("file", file);

          const workflowId = useStore.getState().workflowInfo.id,
            updateToken = useStore.getState().updateToken;

          editorApi
            .uploadFile(`/api/workflow/node/upload_form?workflow_id=${workflowId}&update_token=${updateToken}`, formData)
            .then((response) => {
              if (response?.result?.code === NODE_EXECUTE_STATUS_CODE.SUCCESS) {
                const url = response?.result?.data || "";

                const currentNodeSelectedResultData = {
                  counter: 1,
                  selectedResultsType: SelectedResultsType.URL,
                  selectedResults: [url],
                };
                setPreviewUrl(url);
                setNodeSelectedResultData(id, currentNodeSelectedResultData);
                setNodeRuntimeDataByKey(id, "audioUrl", url);
                setUploading(false);
                setUploadSuccess(true);
              } else {
                throw new Error(response?.result?.message || "Audio file upload failed!");
              }
            })
            .catch((error) => {
              setUploading(false);
              setUploadSuccess(false);
              setPreviewUrl("");
              messageApi.error("Recording upload failed!");

              const currentNodeSelectedResultData = {
                counter: 0,
                selectedResultsType: SelectedResultsType.URL,
                selectedResults: [""],
              };
              setNodeRuntimeDataByKey(id, "audioUrl", "");
              setNodeRuntimeDataByKey(id, "inputValue", "");
              setNodeSelectedResultData(id, currentNodeSelectedResultData);
            });

          // 关闭麦克风
          stream.getTracks().forEach((track) => track.stop());
        };

        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);

        recordTimerRef.current = setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop(); // 自动停止 → 自动进入上传逻辑
            setIsRecording(false);
          }
        }, MAX_DURATION);

        messageApi.info("Recording started...");
      } catch (error) {
        setUploading(false);
        setUploadSuccess(false);
        setPreviewUrl("");
        messageApi.error("Unable to access the microphone. Please check your permission settings!");

        const currentNodeSelectedResultData = {
          counter: 0,
          selectedResultsType: SelectedResultsType.URL,
          selectedResults: [""],
        };
        setNodeRuntimeDataByKey(id, "audioUrl", "");
        setNodeRuntimeDataByKey(id, "inputValue", "");
        setNodeSelectedResultData(id, currentNodeSelectedResultData);
      }
    }
  }, [id, isRecording, mediaRecorder, messageApi]);

  /**
   * URL上传功能
   */
  const handleUrlUpload = useCallback(async () => {
    if (!inputValue.trim()) {
      messageApi.warning("Enter an audio file URL!");
      return;
    }

    // 验证URL格式
    try {
      new URL(inputValue);
    } catch {
      messageApi.error("Please enter a valid URL!");
      return;
    }

    // 检查是否为音频文件URL（通过扩展名）
    const isAudioByUrl = /^https?:\/\/[\w.-]+(?:\:\d+)?(?:\/[\w\-./]*)?\.(mp3|wav)(\?.*)?$/i.test(inputValue);
    if (!isAudioByUrl) {
      messageApi.error("The URL does not point to a valid .mp3 or .wav audio file.");
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setPreviewUrl("");

    try {
      const response = await editorApi.postWorkflowNodeUploadUrl("/api/workflow/node/upload_url", {
        url: inputValue,
        file_type: "audio",
      });

      if (response?.result?.code === NODE_EXECUTE_STATUS_CODE.SUCCESS) {
        const url = response?.result?.data || "";

        // 更新节点数据
        const selectedResultData = {
          counter: 1,
          selectedResultsType: SelectedResultsType.URL,
          selectedResults: [url],
        };

        setPreviewUrl(url);
        setNodeSelectedResultData(id, selectedResultData);
        setNodeRuntimeDataByKey(id, "audioUrl", url);
        setUploading(false);
        setUploadSuccess(true);
      } else {
        throw new Error(response?.result?.message || "Audio file upload failed!");
      }
    } catch (error) {
      setUploading(false);
      setUploadSuccess(false);
      setPreviewUrl("");
      messageApi.error("URL audio file upload failed!");

      const currentNodeSelectedResultData = {
        counter: 0,
        selectedResultsType: SelectedResultsType.URL,
        selectedResults: [""],
      };
      setNodeRuntimeDataByKey(id, "audioUrl", "");
      setNodeRuntimeDataByKey(id, "inputValue", "");
      setNodeSelectedResultData(id, currentNodeSelectedResultData);
    }
  }, [id, inputValue, messageApi]);

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

  /**
   * 处理文件选择
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 文件验证
    const isImage = file.type.startsWith("audio/");
    const isLt10M = file.size / 1024 / 1024 < 10;

    if (!isImage) {
      console.error("Only audio files are allowed!");
      return;
    }

    if (!isLt10M) {
      console.error("Audio file size cannot exceed 50MB!");
      return;
    }

    handleFileUpload(file);

    // 重置input，允许选择同一个文件再次上传
    event.target.value = "";
  };

  /**
   * 处理文件上传
   */
  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        setUploadSuccess(false);
        setPreviewUrl("");

        const formData = new FormData();
        formData.append("file", file);

        const workflowId = useStore.getState().workflowInfo.id,
          updateToken = useStore.getState().updateToken;

        const response = await editorApi.uploadFile(`/api/workflow/node/upload_form?workflow_id=${workflowId}&update_token=${updateToken}`, formData);

        if (response?.result?.code === NODE_EXECUTE_STATUS_CODE.SUCCESS) {
          const url = response?.result?.data || "";

          const selectedResultData = {
            counter: 1,
            selectedResultsType: SelectedResultsType.URL,
            selectedResults: [url],
          };

          setNodeSelectedResultData(id, selectedResultData);
          setNodeRuntimeDataByKey(id, "audioUrl", url);
          setPreviewUrl(url);
          setUploadSuccess(true);
        } else {
          throw new Error(response?.result?.message || "Audio file upload failed!");
        }
      } catch (err) {
        messageApi.error("Audio file upload failed!");
        setUploadSuccess(false);
        setPreviewUrl("");
        const currentNodeSelectedResultData = {
          counter: 0,
          selectedResultsType: SelectedResultsType.URL,
          selectedResults: [""],
        };
        setNodeRuntimeDataByKey(id, "audioUrl", "");
        setNodeRuntimeDataByKey(id, "inputValue", "");
        setNodeSelectedResultData(id, currentNodeSelectedResultData);
      } finally {
        setUploading(false);
      }
    },
    [id, messageApi]
  );

  return (
    <div ref={anchorRef} className={`w-[300px] z-index-100 flex flex-col rounded-[5px] cursor-default bg-white outline outline-2 ${selected ? " outline-solid " : isHovered ? " outline-dotted " : " outline-solid "} ${selected || isHovered ? " outline-[#0D99FF]" : " outline-[#E9E9E9]"}`}>
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
          <div
            className="node-audioinput-search-input content-container relative w-full overflow-hidden h-[205px] bd-white flex flex-col items-center justify-center shadow-none bd-white rounded-b-[5px] no-drag no-wheel no-pan"
            data-nodrag="true"
            data-nopan="true"
            data-nowheel="true"
            style={{ overscrollBehavior: "contain", touchAction: "pan-y" }}
            onWheelCapture={(e: React.WheelEvent<HTMLDivElement>) => {
              e.stopPropagation();
            }}
            onWheel={(e: React.WheelEvent<HTMLDivElement>) => {
              e.stopPropagation();
            }}
            onPointerDownCapture={(e) => {
              e.stopPropagation();
            }}
            onMouseDownCapture={(e) => {
              e.stopPropagation();
            }}
          >
            {/* 音频输入区域 */}
            <div className="flex items-center px-3 pt-[22px] pb-0">
              <div className="flex items-center h-[40px] outline outline-1 outline-[#E9E9E9] rounded-[4px]">
                {/* 在线音频地址输入 */}
                <Input placeholder="An audio URL" value={inputValue} onChange={(e) => handleInputChange(e.target.value)} onPressEnter={handleUrlUpload} className="flex w-[168px] h-[36px] !border-0 !outline-0 items-center justify-center" suffix={null} />

                {/* 竖线分割线 */}
                <div className="w-px bg-[#E9E9E9] h-[30px] self-center" />

                {/* 在线音频地址提交按钮 */}
                <Button className={`node-audioinput-search-button flex w-[60px] h-[36px] items-center justify-center !border-0 !outline-0 text-[13px] font-normal ${inputValue.length > 0 ? " text-[#000000]" : " text-[#989898] hover:text-[#000000]"}`} onClick={handleUrlUpload}>
                  Upload
                </Button>
              </div>

              {/* 在线录制音频按钮 */}
              <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">You can record up to 1min audio</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                <div
                  className={`flex items-center justify-center w-[40px] h-[40px] ml-[9px] rounded !p-0 outline outline-1 outline-[#E9E9E9] ${isRecordingBtnHovered ? "bg-[#F3F3F3]" : "bg-[#FFFFFF]"}`}
                  onClick={handleRecordClick}
                  onMouseEnter={() => setIsRecordingBtnHovered(true)}
                  onMouseLeave={() => setIsRecordingBtnHovered(false)}
                >
                  {isRecording ? (
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="text-[12px] text-[#C54949]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                      <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
                    </svg>
                  ) : (
                    <EditorNodes_NodeAudioInput_Record_Svg className="block" color={isRecordingBtnHovered ? "#000000" : "#989898"} />
                  )}
                </div>
              </Tooltip>
            </div>

            {/* 音频提交加载动画、Audio结果显示、音频上传区域 */}
            <div className="relative min-h-[139px] w-full overflow-visible space-y-4 p-3 rounded-b-[5px]">
              {uploading ? (
                // 1、上传加载动画
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <EditorNodes_UploadingSpinAnimation_SVG color="#35C838" />
                  <p className="text-sm font-medium text-[#35C838] mt-2 mb-2">Uploading...</p>
                </div>
              ) : uploadSuccess && previewUrl ? (
                // 2、上传成功（录制上传、在线音频链接上传、本地音频文件上传）、Audio 展示
                <div className="w-full h-full flex items-center justify-between relative">
                  <div className="w-[228px] items-center justify-center">
                    <audio src={previewUrl} controls className="w-[228px] h-[46px] origin-left border rounded-[24px]" />
                  </div>
                  <div
                    className={`flex items-center justify-center w-[40px] h-[40px] ml-[9px] rounded !p-0 hover outline outline-1 outline-[#E9E9E9] ${isRemoveBtnHovered ? "bg-[#F3F3F3]" : "bg-[#FFFFFF]"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                    onMouseEnter={() => setIsRemoveBtnHovered(true)}
                    onMouseLeave={() => setIsRemoveBtnHovered(false)}
                  >
                    <EditorNodes_NodeAudioInput_Remove_Svg className="block" color={isRemoveBtnHovered ? "#C54949" : "#989898"} />
                  </div>
                </div>
              ) : (
                // 3、本地文件上传区域
                <div className="w-full h-full flex flex-col items-center justify-center text-center rounded-md cursor-pointer" onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".webm,.wav,.ogg,.mp3" onChange={handleFileSelect} />
                  <NodeImageInput_ImageUploadSvg />
                  <div className="mt-[10px]">
                    <p className="text-xs font-normal text-[#989898]">Click to select an audio file</p>
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

export default memo(NodeAudioInput);
