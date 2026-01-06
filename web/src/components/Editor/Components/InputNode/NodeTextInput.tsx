/**
 * 文本输入(Text Input)节点组件
 */
import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, NodeResizer as _NodeResizer } from "@xyflow/react";
import { Input, Tooltip } from "antd";
import { getNodeModelsByType, NodeTemplateType, BlockMeta, HandleIsMulti } from "../../Dict/dict";
import useStore from "../../Store/store";
import { NodeTextInputRuntimeData, selectedResultInfo, SelectedResultsType } from "../../Types/runtimeData";
import { getNodeIcon } from "../../SvgLoader/nodeIcon";
import NodeToolbarManager from "../Common/NodeToolbarManager";
import { Node_HandleSvg, EditorNodes_TooltipSvg } from "../../SvgLoader/staticIcon";
import { CONTROL_TAG, NodeTemplateDetail } from "../../Types/types";
import { tipsType } from "../../Types/nodeControlType";

const { TextArea } = Input;

const COMPONMENT_TITLE = "Text";
function NodeTextInput({ id, type, selected }: { id: string; type: NodeTemplateType; selected?: boolean }) {
  const setNodeRuntimeData = useStore((s) => s.setNodeRuntimeData);
  const setNodeRuntimeDataByKey = useStore((s) => s.setNodeRuntimeDataByKey);
  const setNodeSelectedResultData = useStore((s) => s.setNodeSelectedResultData);
  // 获取 Text Input 的模版静态数据
  const nodeTemplateData = useStore.getState().nodeTemplateData?.find((item) => item.template_code === Number(type)) || ({} as NodeTemplateDetail);

  const [textValue, setTextValue] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const hideToolbarTimerRef = useRef<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState<string>(COMPONMENT_TITLE);
  const [isTitleEditable, setIsTitleEditable] = useState(false);
  const lastCaretPosRef = useRef<number>(0);
  const [tips, setTips] = useState<tipsType>({ content: "", items: [] });

  const tipsData = nodeTemplateData?.content?.[CONTROL_TAG.TIPS] || {};
  const InputNodeModel = getNodeModelsByType(type);
  const [textareaHeight, setTextareaHeight] = useState(198); // 初始11行高度 (18px * 11)
  const textareaRef = useRef<any>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // 初始化节点运行时数据
  useEffect(() => {
    setTips(tipsData);
  }, [tipsData]);

  // 初始化节点运行时数据
  useEffect(() => {
    const nodeRuntimeData = useStore.getState().nodeRuntimeData?.[id];
    if (!nodeRuntimeData) {
      // 新建空节点数据初始化
      const currentNodeRuntimeData = {
        content: "",
        textareaHeight: textareaHeight,
        title: COMPONMENT_TITLE,
      } as NodeTextInputRuntimeData;
      setNodeRuntimeData(id, currentNodeRuntimeData);

      const currentNodeSelectedResultData = {
        counter: 0,
        selectedResultsType: SelectedResultsType.TEXT,
        selectedResults: [""],
      } as selectedResultInfo;
      setNodeSelectedResultData(id, currentNodeSelectedResultData);
    } else {
      setTitle(nodeRuntimeData.title);
      setTextValue(nodeRuntimeData.content);
      setTextareaHeight(nodeRuntimeData.textareaHeight);
    }

    // 清理工具栏延迟定时器
    return () => {
      if (hideToolbarTimerRef.current) {
        clearTimeout(hideToolbarTimerRef.current);
        hideToolbarTimerRef.current = null;
      }
    };
  }, []);

  /**
   * 计算文本框高度
   */
  const calculateHeight = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current.resizableTextArea?.textArea || textareaRef.current;

    // 先把 textarea 高度重置为 auto，触发浏览器重新计算 scrollHeight
    textarea.style.height = "auto";

    // 获取内容真实高度（包含 padding，但不包含 margin）
    const scrollHeight = textarea.scrollHeight;

    // 可配置的最小/最大高度（与你现有变量保持一致）
    const minHeight = 198; // 初始11行高度 (18px * 11)
    const maxHeight = 432; // 最大24行高度 (18px * 24)//

    // clamp 到范围内
    const finalHeight = Math.min(maxHeight, Math.max(minHeight, scrollHeight));

    // 设置最终高度（加上 1px 容错可以避免微小抖动）
    const safeHeight = Math.ceil(finalHeight) + 0; // +1 如果你还想微调
    textarea.style.height = `${safeHeight}px`;

    // 仍用状态保存（如果你需要在外部使用）
    setTextareaHeight(safeHeight);
    setNodeRuntimeDataByKey(id, "textareaHeight", safeHeight);
  }, []);

  // 处理文本变化
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let value = e.target.value;
      setTextValue(value);

      // 动态计算并调整文本框高度
      calculateHeight();

      const currentNodeSelectedResultData = {
        counter: value.trim().length > 0 ? 1 : 0,
        selectedResultsType: SelectedResultsType.TEXT,
        selectedResults: [value],
      } as selectedResultInfo;

      setNodeRuntimeDataByKey(id, "content", value);
      setNodeSelectedResultData(id, currentNodeSelectedResultData);
    },
    [calculateHeight, id, setNodeRuntimeDataByKey, setNodeSelectedResultData]
  );

  // 初始化时计算高度
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current && textValue.trim().length > 0) {
        calculateHeight();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  /**
   * 处理标题变化事件
   * @param e 输入事件对象
   */
  const handleTitleChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    setTitle(value);
    setNodeRuntimeDataByKey(id, "title", value);
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
          {/* Handle连接点 - 右侧输出 */}
          {InputNodeModel?.handle?.target?.map((item, index) => {
            const outputHandleType = item.key;
            const handleColor = outputHandleType ? BlockMeta[outputHandleType]?.color ?? "#000" : "#000";

            return (
              <div key={`${id}-handleTarget-${index}`} className="absolute -right-[54px] w-[52px] top-[45px] h-[36px] flex flex-col justify-center">
                <div className="relative flex flex-col items-center w-[52px]">
                  <div className="flex flex-col items-center relative">
                    <Handle type="source" position={Position.Right} id={`${outputHandleType}_${index}_${item.isMulti}`} className="!absolute !w-[36px] !h-[36px] !-translate-y-1/2 !border-none !rounded-full !z-[99] !opacity-0 !pointer-events-auto !transition-colors !duration-200" />
                    <div className="flex flex-col items-center justify-center min-h-[36px]">
                      <div className="relative">
                        <Node_HandleSvg color={handleColor} isEmpty={textValue.length <= 0} isLeft={false} />
                        <div className="absolute inset-0 flex items-center justify-end z-[2] pointer-events-none">
                          <div className={`flex items-center justify-center w-[36px] font-normal text-white ${textValue.length > 0 ? "text-xs" : "text-[10px]"}`}>
                            <span>{textValue.length > 0 ? "1" : item.key}</span>
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
        <div className="flex-1">
          <div
            className="editorTextarea relative w-full overflow-hidden space-y-4 cursor-text p-[4px] pl-[10px] pr-[10px]"
            onWheelCapture={(e) => {
              e.stopPropagation();
            }}
            onWheel={(e) => {
              e.stopPropagation();
            }}
            onMouseDownCapture={(e) => {
              e.stopPropagation();
            }}
            onPointerDownCapture={(e) => {
              e.stopPropagation();
            }}
          >
            <TextArea
              ref={textareaRef}
              value={textValue}
              onChange={handleTextChange}
              placeholder="Start typing...."
              draggable={false}
              autoFocus={false}
              className={`
                w-full
                font-normal text-[12px] text-[#262626]
                text-justify
                !p-0
                nodrag
                overflow-y-auto scrollbar-hide
                resize-none
                outline-none
                border-none
                !rounded-0
                [touch-action:none]
                select-text
                antialiased
                [overscroll-behavior:contain]
                leading-[1.5]
                transition-[height] duration-150 ease-out
                min-h-[198px] max-h-[432px]
              `}
              style={{
                height: textareaHeight,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(NodeTextInput);
