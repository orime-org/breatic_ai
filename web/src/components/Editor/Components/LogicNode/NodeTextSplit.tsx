/**
 * 文本分块节点 (Node Text Split) 组件
 */
import React, { memo, useEffect, useState, useRef, useCallback, useContext } from "react";
import { Handle, Position, NodeResizer as _NodeResizer, useReactFlow } from "@xyflow/react";
import { Checkbox, Button, Input, Select, Skeleton, Tooltip, Modal, App } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { customAlphabet } from "nanoid";

import { getNodeModelsByType, NodeTemplateType, BlockMeta, HandleIsMulti } from "../../Dict/dict";
import { NodeExectionSSEDataGroup, NODE_EXECUTE_STATUS, NodeTemplateDetail, CONTROL_TAG, NODE_EXECUTE_STATUS_CODE, NodeExectionSSEDataResultItemResult } from "../../Types/types";
import { NodeTextSplitRuntimeData, getResultsForRunning, useUpstreamInputs, SelectedResultsType, selectedResultInfo, NodeTextInputRuntimeData, HandleType } from "../../Types/runtimeData";
import { breaticFetchEventSourceWithAuth } from "../../../../api/breaticFetch";
import editorApi from "../../../../api/editorApi";
import useStore from "../../Store/store";
import { textModelType, tipsType } from "../../Types/nodeControlType";
import { NodeTextSplitResultData } from "../../Types/resultData";
import { getNodeIcon } from "../../SvgLoader/nodeIcon";
import NodeToolbarManager from "../Common/NodeToolbarManager";
import {
  EditorNodes_NodeExecuteCredit_Svg,
  EditorNodes_NodeExecuteTime_Svg,
  EditorNodes_TooltipSvg,
  Node_HandleSvg,
  EditorNodes_NodeExecuteReadyStatus_Svg,
  EditorNodes_NodeExecuteReadyHoverStatus_Svg,
  EditorNodes_NodeExecuteWaitStatus_Svg,
  EditorNodes_NodeExecuteRunningStatus_Svg,
  NodeSelectComponent_SuffixSvg,
  EditorNodes_NodeExecuteResult_Copy_Svg,
  EditorNodes_NodeExecuteResult_Edit_Svg,
  EditorNodes_ModelClose_Svg,
} from "../../SvgLoader/staticIcon";
import { getModelIcon } from "../../SvgLoader/modelIcon";
import { ThinScrollbar } from "../SceneEditor/VideoEditor/utils/Scrollbar";
import { smoothScrollToTop } from "../../Utils/smoothScrollToTop";
import { formatDisplayValue } from "../../Utils/index";
import LoadingSkeletonCard from "../../../common/LoadingSkeletonCard";
import { UserContexts } from '../../../../contexts/user-contexts'

const { TextArea } = Input;
const uuid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 32); // 示例："019a6bc844db7c0b96bcdaf3c3ba567c"

const COMPONMENT_TITLE = "Split Texts";
function NodeTextSpliter({ id, type, selected }: { id: string; type: NodeTemplateType; selected: boolean }) {
  /**
   * Store数据
   */
  //#region
  const nodeResultData = useStore((s) => s.nodeResultData?.[id]) || [];
  const setNodeRuntimeData = useStore((s) => s.setNodeRuntimeData);
  const setNodeRuntimeDataByKey = useStore((s) => s.setNodeRuntimeDataByKey);
  const setNodeSelectedResultData = useStore((s) => s.setNodeSelectedResultData);
  const setNodeResultData = useStore((s) => s.setNodeResultData);

  const nodeTemplateData = useStore.getState().nodeTemplateData?.find((item) => item.template_code === Number(type)) || ({} as NodeTemplateDetail);
  //#endregion

  const { message: messageApi } = App.useApp();

  // 输入文本
  const [inputValue, setInputValue] = useState("");

  // 模型索引
  const [modelIndex, setModelIndex] = useState(0);

  // 模型列表
  const [modelOptions, setModelOptions] = useState<textModelType[]>([]);

  const modelDatas = nodeTemplateData?.content?.[CONTROL_TAG.TEXT_MODEL] || [];

  // 上游数据
  const { counter, handleCounters } = useUpstreamInputs(id);

  // 节点执行状态
  const [nodeExecuteState, setNodeExecuteState] = useState(NODE_EXECUTE_STATUS.WAIT);

  // 提示信息
  const [tips, setTips] = useState<tipsType>({ content: "", items: [] });
  const tipsData = nodeTemplateData?.content?.[CONTROL_TAG.TIPS] || {};

  // 当前节点执行完整骨架屏数据
  const [currentNodeExecuteFullSkeletonData, setCurrentNodeExecuteFullSkeletonData] = useState<NodeTextSplitResultData[][]>([]);
  const currentNodeExecuteFullSkeletonDataRef = useRef<NodeTextSplitResultData>({} as NodeTextSplitResultData);

  const InputNodeModel = getNodeModelsByType(type);

  // 为单节点执行的 SSE 连接做控制，避免重复连接与内存泄漏
  const sseAbortRef = useRef<AbortController | null>(null);

  // 复选框子项状态
  const [childSelectedStates, setChildSelectedStates] = useState<{
    [key: string]: boolean;
  }>({});
  // 复选框父项状态
  const [parentSelectedStates, setParentSelectedStates] = useState<{
    [key: string]: boolean;
  }>({});
  // 复选框父项选中子项计数器
  const [groupChildSelectedCounter, setGroupChildSelectedCounter] = useState<{
    [key: string]: number;
  }>({});

  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const hideToolbarTimerRef = useRef<number | null>(null);
  const [isTitleEditable, setIsTitleEditable] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const lastCaretPosRef = useRef<number>(0);
  const [title, setTitle] = useState<string>(COMPONMENT_TITLE);
  const [isExecBtnHovered, setIsExecBtnHovered] = useState(false);
  const [isEditHovered, setIsEditHovered] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTarget, setEditTarget] = useState<{ executeIndex: number; itemIndex: number; resultId: string; nodeExecId: string } | null>(null);

  // 用来挂载下拉框弹出项
  const anchorRef = useRef<HTMLDivElement>(null);

  const { getNodes } = useReactFlow();
  const addNode = useStore((s) => s.addNode);

  const resultListRef = useRef<any>(null); // 结果列表容器
  
  const { refreshCredits } = useContext(UserContexts);

  // 初始化数据： 文本模型下拉列表项数据、提示信息
  useEffect(() => {
    const llmsModelSelectOptions = () => {
      if (!modelDatas || !Array.isArray(modelDatas)) {
        return [];
      }

      // 映射到组件使用的结构
      return modelDatas.map((item: any, index: number) => ({
        value: index.toString(),
        label: <span>{item.label}</span>,
        description: item.description,
        credits: item.credits,
        icon: item.icon_name,
      }));
    };
    setModelOptions(llmsModelSelectOptions);
    setTips(tipsData);
  }, [modelDatas, tipsData]);

  /**
   * 初始化数据： 节点运行时数据
   */
  useEffect(() => {
    const nodeRuntimeData = useStore.getState().nodeRuntimeData?.[id];
    if (!nodeRuntimeData) {
      // 新建空节点数据初始化
      let currentNodeRuntimeData: NodeTextSplitRuntimeData = {
        content: "",
        modelIndex: 0,
        title: COMPONMENT_TITLE,
      };
      setNodeRuntimeData(id, currentNodeRuntimeData);

      const currentNodeSelectedResultData = {
        counter: 0,
        selectedResultsType: SelectedResultsType.TEXT_LIST,
        selectedResults: [""],
      } as selectedResultInfo;
      setNodeSelectedResultData(id, currentNodeSelectedResultData);

      setInputValue(currentNodeRuntimeData.content);
      setModelIndex(currentNodeRuntimeData.modelIndex);
    } else {
      // 撤销或刷新节点数据时，更新组件状态
      setInputValue(nodeRuntimeData.content);
      setModelIndex(nodeRuntimeData.modelIndex);
      setTitle(nodeRuntimeData.title);

      // 选项选中状态
      const nodeSelectedResultData = useStore.getState().nodeSelectedResultData?.[id];
      const selectedResults = nodeSelectedResultData?.selectedResults || {};
      const parsedSelectedResults = parseStoreSelectedStatesToState(selectedResults);

      setChildSelectedStates(parsedSelectedResults);
    }

    return () => {
      // 组件卸载时主动断开 SSE
      sseAbortRef.current?.abort();
      sseAbortRef.current = null;
    };
  }, []);

  // 执行状态变更
  useEffect(() => {
    // 执行状态变更
    if (nodeExecuteState !== NODE_EXECUTE_STATUS.RUNNING) {
      const validCounterLength = Object.values(handleCounters).filter((v) => v > 0).length;
      if (validCounterLength !== InputNodeModel.handle.source?.length) {
        setNodeExecuteState(NODE_EXECUTE_STATUS.WAIT);
      } else {
        setNodeExecuteState(NODE_EXECUTE_STATUS.READY);
      }
    }
  }, [counter, handleCounters, nodeExecuteState]);

  /**
   * 处理输入框值变化
   */
  const handleInputValueOnChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = e.target;
      setInputValue(value);
      setNodeRuntimeDataByKey(id, "content", value);
    },
    [id]
  );

  /**
   * 节点执行事件 处理函数
   */
  const handleNodeExecuteClickEvent = () => {
    // 获取上游数据
    const edges = useStore.getState().edges;
    // 解析上游数据
    let sourceText: string[] = [];

    InputNodeModel?.handle?.source?.map((item, index) => {
      const inputHandleType = item.key; // Handle 的类型：text、image
      // 精准命中当前桩的上游边
      const upstreamEdge = edges.filter((e) => e.target === id && e.targetHandle === `${inputHandleType}_${index}_${item.isMulti}`);

      // 获取边对应的上游节点ID
      const sourceNodeId = upstreamEdge.map((item) => item.source);

      // 获取上游节点的ResultData
      const resultsList = getResultsForRunning(sourceNodeId);

      resultsList.forEach((group) => {
        group.forEach((item: any | string) => {
          const value = typeof item === "string" ? item : item.result;
          if (inputHandleType === HandleType.TEXT) sourceText.push(value);
        });
      });
    });

    if (nodeExecuteState !== NODE_EXECUTE_STATUS.RUNNING) {
      setNodeExecuteState(NODE_EXECUTE_STATUS.RUNNING);

      // 构建骨架屏数据
      const skeletonResults = {
        index: 0,
        id: "",
        result: [],
        status_code: NODE_EXECUTE_STATUS_CODE.SUCCESS,
        source_text: sourceText[0],
        credits: 0,
        exec_time: 0,
        create_time: 0,
        node_exec_id: "",
        model_id: modelDatas[modelIndex].value,
        model_name: modelDatas[modelIndex].label,
        model_icon_name: modelDatas[modelIndex].icon_name,
      };

      currentNodeExecuteFullSkeletonDataRef.current = skeletonResults;
      setCurrentNodeExecuteFullSkeletonData([[skeletonResults]]);
    }

    // 若存在上一条连接，先断开
    sseAbortRef.current?.abort();
    const controller = new AbortController();
    sseAbortRef.current = controller;

    // 根据节点类型构建请求参数
    const workflowId = useStore.getState().workflowInfo.id,
      updateToken = useStore.getState().updateToken;
    const buildRequestParams = () => {
      return {
        model_id: modelDatas[modelIndex].value,
        template_code: Number(type),
        id: id,
        flow_id: workflowId,
        text_based_blocks: {
          source_text: sourceText,
          instruction: inputValue,
        },
        extra_info: {
          model_name: modelDatas[modelIndex].label,
          model_icon_name: modelDatas[modelIndex].icon_name,
          selectedResultsType: SelectedResultsType.TEXT_LIST,
        },
      };
    };

    let requestParams: any = {};
    requestParams = buildRequestParams();
    console.log("NodeTextSplit handleNodeExecuteClickEvent 构建的请求参数:", requestParams);

    // 节点执行状态
    // abort 服务器终止执行， error 说明是服务器错误
    let stopReason = "normal";
    breaticFetchEventSourceWithAuth(`/api/workflow/node/sse?workflow_id=${workflowId}&update_token=${updateToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestParams),
      signal: controller.signal,
      onopen: async (response) => {
        // 跳转到指定的锚点
        smoothScrollToTop(resultListRef.current);

        if (!response.ok) {
          throw new Error("SSE open failed");
        }
      },
      onmessage: (ev) => {
        try {
          if (ev.event === "abort") {
            stopReason = "abort";

            setNodeExecuteState(NODE_EXECUTE_STATUS.READY);
            sseAbortRef.current?.abort();
            sseAbortRef.current = null;

            // 同步Error 信息
            setCurrentNodeExecuteFullSkeletonData([
              [
                {
                  ...currentNodeExecuteFullSkeletonDataRef.current,
                  result: [
                    {
                      id: String(uuid),
                      data: formatDisplayValue(ev.data),
                    },
                  ],
                  status_code: NODE_EXECUTE_STATUS_CODE.ERROR,
                },
              ],
              ...(useStore.getState().nodeResultData[id] || []),
            ]);
          } else if (ev.event === "error") {
            stopReason = "error";
            setNodeExecuteState(NODE_EXECUTE_STATUS.READY);
            sseAbortRef.current?.abort();
            sseAbortRef.current = null;

            // 同步Error 信息
            setCurrentNodeExecuteFullSkeletonData([
              [
                {
                  ...currentNodeExecuteFullSkeletonDataRef.current,
                  result: [
                    {
                      id: String(uuid),
                      data: formatDisplayValue(ev.data),
                    },
                  ],
                  status_code: NODE_EXECUTE_STATUS_CODE.ERROR,
                },
              ],
              ...(useStore.getState().nodeResultData[id] || []),
            ]);
          } else if (ev.event === "data") {
            // event = "data"
            const raw = ev.data;
            if (typeof raw !== "string") {
              console.warn("SSE message is not a string, ignore");
              return;
            }
            let nodeExecutionResulDataRow: NodeExectionSSEDataGroup;
            try {
              nodeExecutionResulDataRow = JSON.parse(raw); // 服务端推送的 JSON
            } catch (parseErr) {
              console.error("SSE message JSON parse error", parseErr);
              return;
            }

            const parsedNodeResultData = parseNodeResultData(nodeExecutionResulDataRow);
            setCurrentNodeExecuteFullSkeletonData([[parsedNodeResultData]]);
            currentNodeExecuteFullSkeletonDataRef.current = parsedNodeResultData;
          } else if (ev.event == "done") {
            if (stopReason === "normal") {
              // 跳转到指定的锚点
              smoothScrollToTop(resultListRef.current);

              // 写入完整数据到Store
              // 旧数据读取 - 拼接 - 写入
              setNodeResultData(id, [[currentNodeExecuteFullSkeletonDataRef.current], ...(useStore.getState().nodeResultData[id] || [])]);

              // 刷新积分
              refreshCredits();
            }

            // 变更执行状态
            setNodeExecuteState(NODE_EXECUTE_STATUS.READY);
            return;
          }
        } catch (error) {
          console.error("Handle SSE Message Error:", error);
          sseAbortRef.current?.abort();
          sseAbortRef.current = null;

          // TOTO: 同步Error 信息
          try {
            const errorMsg = JSON.stringify(error);
            messageApi.error(errorMsg);
          } catch (error) {
            console.error("SSE error JSON parse error", error);
            return;
          }
        }
      },
      onerror: (err) => {
        setNodeExecuteState(NODE_EXECUTE_STATUS.READY);
        console.error("SSE error", err);
        sseAbortRef.current?.abort();
        sseAbortRef.current = null;

        err.message && messageApi.error(err.message);
      },
      onclose: () => {
        setNodeExecuteState(NODE_EXECUTE_STATUS.READY);
        sseAbortRef.current?.abort();
        sseAbortRef.current = null;
      },
    });
  };

  // 更新父项选中状态（多个项）
  const updateParentSelection = (parentId: string, checked: boolean) => {
    // 更新父项选中状态
    const newState = { ...parentSelectedStates, [parentId]: checked };
    setParentSelectedStates(newState);

    // 全选/取消全选时，更新当前页面所有可选择的子项选中状态
    if (nodeResultData.length > 0) {
      const parentActualIndex = Number(parentId) + nodeResultData.length;
      const selectableKeys = getParentSelectableKeys(parentActualIndex);

      // 更新父项选中子项计数器
      setGroupChildSelectedCounter((prev) => ({
        ...prev,
        [parentId]: checked ? selectableKeys.length : 0,
      }));

      // 更新子项选中状态
      if (selectableKeys.length > 0) {
        setChildSelectedStates((prev) => {
          const next = { ...prev };
          selectableKeys.forEach((key: string) => {
            next[key] = checked;
          });
          syncSelectedStatesToStore(next);
          return next;
        });
      }
    }
  };

  // 更新子项选中状态（单个项）
  const updateChildSelection = (childId: string, checked: boolean) => {
    console.log("updateChildSelection", childId, checked);

    // 更新子项选中状态
    let newState = { ...childSelectedStates, [childId]: checked };
    setChildSelectedStates(newState);
    syncSelectedStatesToStore(newState);

    // 倒推父级索引
    const parentIndex = Number(childId.split("_")[0]);
    const parentActualIndex = parentIndex + nodeResultData.length;

    // 更新后重新计算全选状态
    const selectableKeys = getParentSelectableKeys(parentActualIndex);
    if (selectableKeys.length > 0) {
      const allSelected = selectableKeys.every((key) => newState[key]),
        validSelected = selectableKeys.filter((key) => newState[key]);

      // 更新父项选中子项计数器
      setGroupChildSelectedCounter((prev) => ({
        ...prev,
        [String(parentIndex)]: validSelected.length,
      }));

      // 更新父项选中状态
      setParentSelectedStates((prev) => ({
        ...prev,
        [parentIndex]: allSelected,
      }));
    }
  };

  /**
   * 同步子项选中状态到 Store
   * @param states 子项选中状态
   * @description 转换 childSelectedStates 格式并同步到 Store
   *    {"-1_0": true, "-2_0": true, "-2_1": false} -> {"batch_-1": [0], "batch_-2": [0]}
   */
  const syncSelectedStatesToStore = (states: Record<string, boolean>) => {
    const transformedSelectedResults: Record<string, number[]> = {};

    Object.entries(states).forEach(([key, isSelected]) => {
      if (isSelected) {
        // 解析 key 格式: "batchIndex_itemIndex"
        const [executeIndexStr, itemIndexStr] = key.split("_");

        // 转换为 batch_reverseIndex 格式
        const executeIndex = "batch_" + executeIndexStr;
        const itemIndex = parseInt(itemIndexStr, 10);

        if (!transformedSelectedResults[executeIndex]) {
          transformedSelectedResults[executeIndex] = [];
          transformedSelectedResults[executeIndex] = [itemIndex];
        } else {
          transformedSelectedResults[executeIndex].push(itemIndex);
        }
      }
    });

    // 同步到 Store
    setNodeSelectedResultData(id, {
      counter: Object.values(states).filter((v) => v).length,
      selectedResults: transformedSelectedResults,
      selectedResultsType: SelectedResultsType.TEXT_LIST,
    });
  };

  /**
   * 解析子项选中状态到子项选中状态格式
   * @param selectedResults 子项选中状态  {"batch_-1": [0], "batch_-2": [0]}
   * @returns 转换后的子项选中状态格式  {"-1_0": true, "-2_0": true, "-2_1": false}
   * @description 转换 Store 子项选中状态格式并同步到 childSelectedStates
   */
  const parseStoreSelectedStatesToState = (selectedResults: Record<string, number[]>) => {
    const nodeResultData = useStore.getState().nodeResultData?.[id],
      nodeResultDataLength = nodeResultData?.length || 0;

    const context: Record<string, boolean> = {};
    const selectResultsWithoutBatchStr = Object.fromEntries(Object.entries(selectedResults).map(([key, value]) => [key.replace(/^batch_/, ""), value]));

    nodeResultData?.map((item: NodeTextSplitResultData[], index: number) => {
      const parentIndex = index - nodeResultDataLength;
      const parentActualIndex = parentIndex + nodeResultData.length;

      // 更新后重新计算全选状态
      const selectableKeys = getParentSelectableKeys(parentActualIndex);
      if (selectableKeys.length > 0) {
        // 从 selectedResults 中拿到该父组已选中的子项索引列表
        const selectedIndices = selectResultsWithoutBatchStr[parentIndex] || [];

        // 计算当前父组下实际选中的 child 键
        const validSelected = selectableKeys.filter((key) => {
          const [, itemIndexStr] = key.split("_");
          return selectedIndices.includes(parseInt(itemIndexStr, 10));
        });
        const allSelected = validSelected.length === selectableKeys.length;

        // 更新父项选中子项计数器
        setGroupChildSelectedCounter((prev) => ({
          ...prev,
          [parentIndex]: validSelected.length,
        }));

        // 更新父项选中状态
        setParentSelectedStates((prev) => ({
          ...prev,
          [parentIndex]: allSelected,
        }));
      }

      // nodeResultData -> result
      item[0].result.forEach((item: any, itemIndex: number) => {
        context[`${parentIndex}_${itemIndex}`] = selectResultsWithoutBatchStr[parentIndex]?.includes(itemIndex) || false;
      });
      return;
    });

    return context;
  };

  /**
   * 获取当前执行结果数据块有效子项 key
   * @param pIndex 父项索引
   * @returns 有效子项 key 列表
   * @example ['-1_0', '-1_1', '-1_2']
   * @description 只有成功状态的项目才能被选择
   * */
  const getParentSelectableKeys = useCallback(
    (pIndex: number) => {
      const nodeResultData = useStore.getState().nodeResultData?.[id],
        nodeResultDataLength = nodeResultData?.length || 0;

      if (nodeResultDataLength === 0) return [];

      const keys: string[] = [];
      nodeResultData?.forEach((singleExecuteResultsData: NodeTextSplitResultData[], executeIndex: number) => {
        if (executeIndex !== pIndex) return;

        const currentSingleExecuteResult = singleExecuteResultsData[0]?.result || [];
        currentSingleExecuteResult?.forEach((_item, index) => {
          // 只有成功状态的项目才能被选择

          if (singleExecuteResultsData[0]?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS) {
            keys.push(`${executeIndex - nodeResultDataLength}_${index}`);
          }
        });
      });
      return keys;
    },
    [nodeResultData]
  );

  /**
   * 文本模型下拉列表选项 选择事件
   * */
  const handleModelSelect = useCallback(
    (value: string) => {
      setNodeRuntimeDataByKey(id, "modelIndex", Number(value));
      setModelIndex(Number(value));
    },
    [id]
  );

  /**
   * 标题改变事件
   * @param e 输入事件
   */
  const handleTitleChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    setTitle(value);
    setNodeRuntimeDataByKey(id, "title", value);
  };

  /**
   * 解析工作流初始化时的节点执行结果
   * @param nodeResultData 节点执行结果数据
   * @returns 解析后的节点执行结果数据
   */
  const parseNodeResultData = useCallback(
    (nodeResultData: NodeExectionSSEDataGroup) => {
      const exec = nodeResultData.exec_result || {};
      const content = nodeResultData.node_content || {};
      const node_exec_id = nodeResultData.node_exec_id || "";

      return {
        index: 0,
        id: id,
        result: (exec.result as NodeExectionSSEDataResultItemResult[]) ?? ([{ id: node_exec_id, data: formatDisplayValue(exec.msg) }] as NodeExectionSSEDataResultItemResult[]),
        status_code: exec.status_code ?? NODE_EXECUTE_STATUS_CODE.SUCCESS,
        source_text: exec.source_text ?? "",
        credits: exec.credits ?? 0,
        exec_time: exec.exec_time ?? 0,
        create_time: exec.create_time ?? Date.now(),
        node_exec_id: node_exec_id ?? "",
        model_id: content.model_id ?? "",
        model_name: content.extra_info?.model_name ?? "",
        model_icon_name: content.extra_info?.model_icon_name ?? "",
      };
    },
    [id]
  );

  /**
   * 单个文本复制
   * @param text 文本
   */
  const handleTextCopy = (text: string) => {
    if (!text) {
      console.error("复制失败: 文本为空");
      throw new Error("文本为空");
    }

    const nodes = getNodes();
    const current = nodes.find((n) => n.id === id);
    const basePos = current ? { x: current.position.x + 610, y: current.position.y } : { x: 200, y: 200 };

    const newNodeId = `${NodeTemplateType.TEXT_INPUT}-${Date.now()}-${uuid()}`;
    const newNode = {
      id: newNodeId,
      type: NodeTemplateType.TEXT_INPUT,
      position: basePos,
      data: { type: "input", label: "Text" },
    } as any;

    addNode(newNode);



    const runtimeData: NodeTextInputRuntimeData = {
      content: text,
      title: "Text",
    } as any;
    setNodeRuntimeData(newNodeId, runtimeData);
    setNodeSelectedResultData(newNodeId, {
      counter: 1,
      selectedResultsType: SelectedResultsType.TEXT,
      selectedResults: [text],
    });
  };

  /**
   * 文本编辑
   * @param text 文本
   */
  const handleTextEdit = (content: string, executeIndex: number, itemIndex: number, resultId: string, nodeExecId: string) => {
    setEditContent(content);
    setEditTarget({ executeIndex, itemIndex, resultId, nodeExecId });
    setEditModalOpen(true);
  };

  // 文本编辑 - 确认事件
  const handleEditConfirm = async () => {
    if (editTarget) {
      const { executeIndex, itemIndex, resultId, nodeExecId } = editTarget;
      const newNodeResultData = [...nodeResultData];

      const res = await editorApi.postWorkflowNodeResultsDetailSave("/api/workflow/node/results_detail/save", {
        id: nodeExecId,
        result_id: resultId,
        data: editContent,
      });

      if (res.success && res.result.code !== NODE_EXECUTE_STATUS_CODE.SUCCESS) {
        console.error(res.result.msg || "Text editing failed");
        messageApi.error("Text editing failed");
        return;
      }

      if (newNodeResultData[executeIndex] && newNodeResultData[executeIndex][0] && newNodeResultData[executeIndex][0].result && newNodeResultData[executeIndex][0].result[itemIndex]) {
        const newSingleResult = [...newNodeResultData[executeIndex]];
        const newResultItem = { ...newSingleResult[0] };
        const newResultArray = [...newResultItem.result];
        const newItem = { ...newResultArray[itemIndex] };

        newItem.data = editContent;
        newResultArray[itemIndex] = newItem;
        newResultItem.result = newResultArray;
        newSingleResult[0] = newResultItem;
        newNodeResultData[executeIndex] = newSingleResult;

        setNodeResultData(id, newNodeResultData);
      }
    }
    setEditModalOpen(false);
    setEditTarget(null);
    setEditContent("");
  };

  // 文本编辑 - 取消事件
  const handleEditCancel = () => {
    setEditModalOpen(false);
    setEditTarget(null);
    setEditContent("");
  };

  return (
    <div ref={anchorRef}>
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
      <div className={`w-full z-index-100 flex flex-col`}>
        <div
          className="relative flex flex-col items-stretch"
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
          {/* Handle连接点 - 左侧输入 */}
          <div className="absolute -left-[54px] w-[52px] h-auto">
            {InputNodeModel?.handle?.source?.map((item, index) => {
              const inputHandleType = item.key;
              const handleColor = inputHandleType ? BlockMeta[inputHandleType]?.color ?? "#000" : "#000";

              return (
                <div key={`${id}-handleSource-${index}`} className={"absolute w-[52px] h-[36px] flex flex-col justify-center"} style={{ top: `${index * (20 + 36) + 45}px` }}>
                  <div className="relative flex flex-col items-center w-[52px]">
                    <div className="flex flex-col items-center relative">
                      <Handle type="target" position={Position.Left} id={`${inputHandleType}_${index}_${item.isMulti}`} className="!absolute !w-[36px] !h-[36px] !-translate-y-1/2 !border-none !rounded-full !z-[99] !opacity-0 !pointer-events-auto !transition-colors !duration-200" />
                      <div className="flex flex-col items-center justify-center min-h-[36px]">
                        <div className="relative">
                          <Node_HandleSvg color={handleColor} isEmpty={(handleCounters?.[index] || 0) <= 0} isLeft={true} />
                          <div className="absolute inset-0 flex items-center justify-start z-[2] pointer-events-none">
                            <div className={`flex items-center justify-center w-[36px] font-normal text-white ${(handleCounters?.[index] || 0) > 0 ? "text-xs" : "text-[10px]"}`}>
                              <span>{(handleCounters?.[index] || 0) > 0 ? handleCounters?.[index] : item.isMulti !== HandleIsMulti.MULTI ? item.key : `${item.key}s`}</span>
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

          <div className="w-full">
            {/* 节点执行部分 */}
            <div className={`flex flex-col rounded-[5px] border-0 box-border relative cursor-default bg-white outline  outline-2 ${selected ? " outline-solid" : isHovered ? " outline-dotted" : " outline-solid"} ${selected || isHovered ? " outline-[#0D99FF]" : " outline-[#E9E9E9]"}`}>
              {/* 标题部分 */}
              <div className="w-[300px]">
                {/* 标题 */}
                <div className="flex1 h-[44px] flex items-center hover:cursor-grab active:cursor-grabbing">
                  {/* 图标 */}
                  <div className="w-[35px] h-full flex items-center justify-center pl-3 mt-[1px] text-op-text-1">{getNodeIcon(nodeTemplateData.template_icon, "w-[20px] h-[20px]")}</div>
                  <input
                    ref={titleInputRef}
                    className={`max-w-fulls w-[220px] truncate text-[12px] font-bold outline-0 border-0 pl-[10px] ${isTitleEditable ? "nodrag select-text" : "hover:cursor-grab active:cursor-grabbing select-none"}`}
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
                            <div key={"NodeTextToImage_TipsSection_" + index} className="flex items-center text-[10px]">
                              <br />
                              {item || ""}
                            </div>
                          ))}
                        </div>
                      }
                      classNames={{ root: "node-texttoimage-tooltip" }}
                      getPopupContainer={() => anchorRef.current!}
                      mouseEnterDelay={0.1}
                    >
                      <span className="inline-flex items-center cursor-pointer justify-center pointer-events-auto p-4">
                        <EditorNodes_TooltipSvg />
                      </span>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* 分割线 */}
              <div className="w-full border-t bg-[#E9E9E9]" />

              {/* 子内容 */}
              <div className="content-container flex flex-col p-[12px] shadow-none bg-white rounded-b-[5px]">
                {/* musicSettings */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold ">Splitting Rules*</span>
                  </div>
                  <div
                    className="p-[4px] border rounded-[4px] border-[#E9E9E9] no-drag no-pan no-wheel"
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
                    <TextArea
                      placeholder="Describe how to split the input text (optional)."
                      value={inputValue}
                      onChange={handleInputValueOnChange}
                      rows={3}
                      style={{ overscrollBehavior: "contain" }}
                      className={`
                          w-full
                          font-normal text-[12px] text-[#262626]
                          text-justify
                          p-[0px]
                          nodrag
                          overflow-y-auto scrollbar-hide
                          resize-none
                          outline-none
                          border-none
                          [touch-action:none]
                          select-text
                          antialiased
                          [overscroll-behavior:contain]
                          leading-[1.5]
                          transition-[height] duration-150 ease-out
                          min-h-[68px] max-h-[200px]
                      `}
                    />
                  </div>
                </div>

                {/* 模型选择部分 */}
                <div className="space-y-2 nodrag" style={{ position: "relative", zIndex: 10 }}>
                  <div className="flex items-center mt-[12px]">
                    <span className="text-[10px] font-bold ">Select model</span>
                  </div>
                  <Select
                    suffixIcon={<NodeSelectComponent_SuffixSvg />}
                    value={modelIndex.toString()}
                    onChange={handleModelSelect}
                    className="node-workflow w-full"
                    classNames={{
                      popup: {
                        root: "node-texttosplit-modals-select",
                      },
                    }}
                    size="large"
                    options={modelOptions}
                    optionRender={(option, { index }) => {
                      const data = option.data;

                      return (
                        <div className={`group relative flex items-start px-[8px] py-[2px] my-0 h-[44px] w-full overflow-visible rounded transition-colors`}>
                          {/* 左侧图标 */}
                          <div className="mr-[10px] h-full flex-shrink-0 flex items-center justify-center">{getModelIcon(data.icon, "w-5 h-5 block")}</div>

                          {/* 右侧内容区域 */}
                          <div className="flex-1 min-w-0 relative">
                            <div className="h-[40px] w-full flex flex-col justify-center transition-transform duration-200 group-hover:-translate-y-2">
                              {/* 标题行 */}
                              <div className="flex items-center justify-start">
                                <div className="text-[14px] text-gray-800 font-normal truncate mr-1">{data.label}</div>
                                <div className="flex items-center bg-white rounded-md px-1 whitespace-nowrap flex-shrink-0 font-normal text-[10px] text-[#989898]">
                                  <EditorNodes_NodeExecuteCredit_Svg color="#989898" />
                                  <div className="text-xs ml-[2px]">{`${data.credits}`}</div>
                                </div>
                              </div>

                              <div className="absolute w-full left-0 right-0 top-[28px] font-normal text-[10px] text-[#989898] truncate opacity-0 pointer-events-none z-10 transition-opacity duration-200 group-hover:opacity-100">{data.description}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                    labelRender={({ value }) => {
                      const data = modelOptions.find((o) => o.value === value);
                      if (!data) return null;

                      return (
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="flex-shrink-0">{getModelIcon(data.icon, "w-4 h-4 block")}</span>
                          <span className="truncate">{data.label}</span>
                        </span>
                      );
                    }}
                    style={{
                      height: "38px",
                    }}
                    getPopupContainer={() => anchorRef.current!}
                    popupRender={(menu) => (
                      <div
                        onWheel={(e) => e.stopPropagation()} // 阻止 React Flow 捕获滚轮
                      >
                        {menu}
                      </div>
                    )}
                  />
                </div>

                {/* 节点执行部分 */}
                <div className="space-y-2 px-[10px] pt-[12px] nodrag" style={{ position: "relative", zIndex: 10 }}>
                  <div className="flex items-center justify-center w-full">
                    <div className="flex items-center flex-1 gap-[12px]">
                      <div className="flex items-center">
                        <EditorNodes_NodeExecuteTime_Svg />
                        <div className="w-auto h-[15px] text-[10px] text-[#262626] font-normal ml-[3px] flex items-center justify-center px-[7px] py-[3px] bg-zinc-100 rounded-lg">{`~ ${modelDatas[modelIndex]?.genrate_time || "?"}s`}</div>
                      </div>
                      <div className="flex items-center">
                        <EditorNodes_NodeExecuteCredit_Svg />
                        <div className="w-auto h-[15px] text-[10px] text-[#262626] font-normal ml-[3px] flex items-center justify-center px-[7px] py-[3px] bg-zinc-100 rounded-lg">{`~ ${(handleCounters?.[0] || 1) * modelDatas[modelIndex]?.credits || "?"} Credits`}</div>
                      </div>
                    </div>
                    {/* 当前节点的执行状态 */}
                    <div className="node-workflow-exec-btn flex items-center relative">
                      <Button
                        disabled={nodeExecuteState === NODE_EXECUTE_STATUS.WAIT || nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING}
                        onClick={handleNodeExecuteClickEvent}
                        onMouseEnter={() => setIsExecBtnHovered(true)}
                        onMouseLeave={() => setIsExecBtnHovered(false)}
                        className={`relative flex items-center justify-center w-[32px] h-[32px] shadow-0`}
                        type="text"
                        shape="circle"
                        icon={
                          <span className="inline-flex items-center justify-center w-[25px] h-[25px]">
                            {nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING ? (
                              <EditorNodes_NodeExecuteRunningStatus_Svg className="w-[25px] h-[25px]" />
                            ) : nodeExecuteState === NODE_EXECUTE_STATUS.WAIT ? (
                              <EditorNodes_NodeExecuteWaitStatus_Svg className="w-[25px] h-[25px]" />
                            ) : isExecBtnHovered ? (
                              <EditorNodes_NodeExecuteReadyHoverStatus_Svg className="w-[25px] h-[25px]" />
                            ) : (
                              <EditorNodes_NodeExecuteReadyStatus_Svg className="w-[25px] h-[25px]" />
                            )}
                          </span>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 节点执行结果部分 */}
            <div
              className={`flex flex-col flex-1 mt-[6px] rounded-[5px] w-full h-[668px] overflow-hidden border-0 box-border cursor-default bg-white outline outline-2 ${selected ? " outline-solid" : isHovered ? " outline-dotted" : " outline-solid"} ${
                selected || isHovered ? " outline-[#0D99FF]" : " outline-[#E9E9E9]"
              }`}
            >
              {/* 顶部 标题 + Check All*/}
              <div className="w-full">
                <div className="flex1 h-[45px] flex justify-between p-2.5 hover:cursor-grab active:cursor-grabbing">
                  <div className="h-full flex items-center justify-center text-op-text-1">
                    <div className="text-[12px] font-bold">Results</div>
                  </div>
                </div>
              </div>

              {/* 分割线 */}
              <div className="w-full border-t bg-[#E9E9E9]" />

              {/* 具体的结果集部分 */}
              <div
                className="flex flex-col flex-1 w-full h-auto p-1 overflow-hidden bg-white no-pan no-drag no-wheel"
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
                <ThinScrollbar ref={resultListRef} className="flex-1" style={{ width: "100%" }}>
                  {/* 节点执行时： 骨架屏 + ndoeResultData */}
                  {/* 节点执行后 && 初始化： nodeResultData */}
                  {nodeResultData?.length > 0 || currentNodeExecuteFullSkeletonData?.length > 0 ? (
                    <>
                      {nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING && currentNodeExecuteFullSkeletonData?.length ? (
                        <>
                          {/* 骨架屏 + nodeResultData */}
                          {/* 1 骨架屏部分 */}
                          <div className="border-box border border-[#E9E9E9] p-1 rounded-[5px]">
                            {/* 数据块勾选 + 查看 */}
                            <div className="flex items-center justify-between rounded-t-[5px] p-1 w-full">
                              <div className="flex items-center">
                                <Checkbox className="shrink-0 w-[15px] h-[15px]" disabled={nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING} />
                                <div className="flex items-center ml-1">
                                  <div className="px-2 h-[15px] rounded-[7.5px] bg-[#F3F3F3] text-[10px] font-normal  text-[#989898]">0 selected</div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <div className="text-[10px] font-bold text-[#000000]">Run History</div>
                                <div className="flex-1 pl-1 flex items-center">
                                  <div className="px-2 rounded-full bg-[#F3F3F3] text-[9px] font-normal text-[#989898]">
                                    {nodeResultData.length + 1} / {nodeResultData.length + 1}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Prompt 文本 */}
                            <div className="p-1">
                              <div className="text-[10px] font-normal text-[#989898] line-clamp-2">
                                <Tooltip title={<div className="text-2.5 inline-block p-[10px] select-text whitespace-pre-wrap cursor-text text-justify">{`${currentNodeExecuteFullSkeletonData?.[0]?.[0]?.source_text || ""}`}</div>} getPopupContainer={() => anchorRef.current!} mouseEnterDelay={0.1}>
                                  <div className="w-full text-justify">{`${currentNodeExecuteFullSkeletonData?.[0]?.[0]?.source_text || ""}`}</div>
                                </Tooltip>
                              </div>
                            </div>

                            {currentNodeExecuteFullSkeletonData?.map((item, sourceIndex) => {
                              const currentSkeletonData = item[0];
                              return (
                                <div key={`${id}-SkeletonTop-${sourceIndex}`} className={`flex flex-col ${sourceIndex !== 0 ? "mt-1" : ""}`}>
                                  <div
                                    className="grid w-full"
                                    style={{
                                      gridTemplateColumns: "repeat(1, minmax(0px, 1fr))",
                                    }}
                                  >
                                    <div className="text-card-foreground overflow-hidden shadow-none border-0 rounded-none bg-[#F3F3F3]">
                                      <div className="p-0 relative group w-[282px] h-[159px]">
                                        <div className="absolute top-1 left-1">
                                          <div className="flex items-center gap-1">
                                            {currentSkeletonData?.result && (
                                              <>
                                                <Checkbox className="shrink-0 w-[15px] h-[15px]" disabled={nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING || currentSkeletonData?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS} />
                                                <div className="flex items-center justify-center h-[24px] bg-white/60 rounded-xl pl-2 pr-[10px] gap-1">
                                                  {getModelIcon(currentSkeletonData?.model_icon_name, "w-4 h-4 block")}
                                                  <span className="text-[12px] leading-[15px] text-[#262626] font-normal">{currentSkeletonData?.model_name || ""}</span>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <div className="relative w-[282px] h-[159px]" style={{ aspectRatio: "16 / 9" }}>
                                          {currentSkeletonData?.result?.length > 0 ? (
                                            <>
                                              {currentSkeletonData?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS ? (
                                                <div className="text-[#989898]">{`${currentSkeletonData?.result[0]?.data || ""}`}</div>
                                              ) : (
                                                <div className="text-[#C54949]">{`Error: ${currentSkeletonData?.result[0]?.data || ""}`}</div>
                                              )}
                                            </>
                                          ) : (
                                            <LoadingSkeletonCard aspectRatio={"16 / 9"} />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {/* 2 nodeResultData 部分 */}
                          {nodeResultData?.[0]?.length > 0 &&
                            nodeResultData?.map((singleExecuteResultsData: NodeTextSplitResultData[], executeIndex: number) => {
                              return (
                                <div key={`${id}-${singleExecuteResultsData?.[0]?.id}-${executeIndex}`} className="border-box border border-[#E9E9E9] p-1 rounded-[5px] mt-1">
                                  {/* 数据块勾选 +查看 */}
                                  <div className="flex items-center justify-between rounded-t-[5px] p-1 w-full">
                                    <div className="flex items-center">
                                      <Checkbox className="shrink-0 w-[15px] h-[15px]" checked={parentSelectedStates[executeIndex - nodeResultData.length]} disabled={nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING} />
                                      <div className="flex items-center ml-1">
                                        <div className="px-2 h-[15px] rounded-[7.5px] bg-[#F3F3F3] text-[10px] font-normal  text-[#989898]">{groupChildSelectedCounter[executeIndex - nodeResultData.length] || 0} selected</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center">
                                      <div className="text-[10px] font-bold text-[#000000]">Run History</div>
                                      <div className="flex-1 pl-1 flex items-center">
                                        <div className="px-2 rounded-full bg-[#F3F3F3] text-[9px] font-normal  text-[#989898]">
                                          {nodeResultData.length - executeIndex} / {nodeResultData.length + 1}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Prompt 文本 */}
                                  <div className="p-1">
                                    <div className="text-[10px] font-normal text-[#989898] line-clamp-2">
                                      <Tooltip title={<div className="text-2.5 inline-block p-[10px] select-text whitespace-pre-wrap cursor-text text-justify">{`${singleExecuteResultsData?.[0]?.source_text || ""}`}</div>} getPopupContainer={() => anchorRef.current!} mouseEnterDelay={0.1}>
                                        <div className="w-full text-justify">{`${singleExecuteResultsData?.[0]?.source_text || ""}`}</div>
                                      </Tooltip>
                                    </div>
                                  </div>

                                  {/* Prompt 执行结果 */}
                                  {singleExecuteResultsData &&
                                    singleExecuteResultsData?.[0]?.result?.map((item, index: number) => {
                                      const displayStr = formatDisplayValue(item?.data || "");
                                      return (
                                        <div key={`${id}-${singleExecuteResultsData?.[0]?.node_exec_id}-${index}`} className={`flex flex-col ${index !== 0 ? "mt-1" : ""}`}>
                                          <div
                                            className="grid w-full"
                                            style={{
                                              gridTemplateColumns: "repeat(1, minmax(0px, 1fr))",
                                            }}
                                          >
                                            <div className="text-card-foreground overflow-hidden shadow-none border-0 rounded-none bg-[#F3F3F3]">
                                              <div className="p-0 relative group h-auto">
                                                {/* Split 文本 */}
                                                <div className="relative h-auto p-1 pt-[28px]">
                                                  <div className="w-full text-justify text-[12px] font-normal line-clamp-5 break-words whitespace-pre-wrap">
                                                    {singleExecuteResultsData?.[0]?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS ? <div className="text-[#989898]">{`${displayStr}`}</div> : <div className="text-[#C54949]">{`Error: ${displayStr}`}</div>}
                                                  </div>
                                                </div>

                                                {/* Checkbox & 模型图标及名称 */}
                                                <div className="absolute top-1 left-1">
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      className="shrink-0 w-[15px] h-[15px]"
                                                      disabled={singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS || nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING}
                                                      checked={childSelectedStates[`${executeIndex - nodeResultData.length}_${index}`] || false}
                                                      onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        updateChildSelection(`${executeIndex - nodeResultData.length}_${index}`, checked);
                                                      }}
                                                    />
                                                    <div className="flex items-center justify-center h-[24px] bg-white/60 rounded-xl pl-2 pr-[10px] gap-1">
                                                      {getModelIcon(singleExecuteResultsData?.[0]?.model_icon_name, "w-4 h-4 block")}
                                                      <span className="text-[12px] leading-[15px] text-[#262626] font-normal">{singleExecuteResultsData?.[0]?.model_name || ""}</span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* 复制 & 编辑 */}
                                                {singleExecuteResultsData?.[0]?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS && (
                                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <div className="flex items-center gap-1">
                                                      <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Copy</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                                                        <div
                                                          className={`h-[24px] w-[24px] rounded-[3px] !p-0 hover bg-[#FFFFFF] outline outline-1 outline-[#989898] hover:outline-[#000000] text-[#989898] hover:text-[#000000] ${
                                                            singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS ? " opacity-50 cursor-not-allowed" : " cursor-pointer"
                                                          }`}
                                                          aria-disabled={singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS}
                                                          onClick={(e) => {
                                                            if (singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS) return;
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleTextCopy(displayStr);
                                                          }}
                                                        >
                                                          <EditorNodes_NodeExecuteResult_Copy_Svg className="block" color="currentColor" />
                                                        </div>
                                                      </Tooltip>
                                                      <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Edit</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                                                        <div
                                                          className={`h-[24px] w-[24px] rounded-[3px] !p-0 hover bg-[#FFFFFF] ${isEditHovered ? " outline outline-1 outline-[#000000]" : " outline outline-1 outline-[#989898]"} ${
                                                            singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS ? " opacity-50 cursor-not-allowed" : " cursor-pointer"
                                                          }`}
                                                          aria-disabled={singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS}
                                                          onClick={(e) => {
                                                            if (singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS) return;
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleTextEdit(displayStr, executeIndex, index, item?.id, singleExecuteResultsData?.[0]?.node_exec_id);
                                                          }}
                                                          onMouseEnter={() => setIsEditHovered(true)}
                                                          onMouseLeave={() => setIsEditHovered(false)}
                                                        >
                                                          <EditorNodes_NodeExecuteResult_Edit_Svg className="block" color={isEditHovered ? "#000000" : "#989898"} />
                                                        </div>
                                                      </Tooltip>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              );
                            })}
                        </>
                      ) : (
                        // nodeResultData 部分
                        nodeResultData?.[0]?.length > 0 &&
                        nodeResultData?.map((singleExecuteResultsData: NodeTextSplitResultData[], executeIndex: number) => {
                          return (
                            <div key={`${id}-${singleExecuteResultsData?.[0]?.id}-${executeIndex}`} className={`border-box border border-[#E9E9E9] p-1 rounded-[5px] ${executeIndex === 0 ? "" : "mt-1"}`}>
                              {/* 数据块勾选 +查看 */}
                              <div className="flex items-center justify-between rounded-t-[5px] p-1 w-full">
                                <div className="flex items-center">
                                  <Checkbox
                                    className="shrink-0 w-[15px] h-[15px]"
                                    checked={parentSelectedStates[executeIndex - nodeResultData.length]}
                                    disabled={nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      updateParentSelection(`${executeIndex - nodeResultData.length}`, checked);
                                    }}
                                  />
                                  <div className="flex items-center ml-1">
                                    <div className="px-2 h-[15px] rounded-[7.5px] bg-[#F3F3F3] text-[10px] font-normal  text-[#989898]">{groupChildSelectedCounter[executeIndex - nodeResultData.length] || 0} selected</div>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="text-[10px] font-bold text-[#000000]">Run History</div>
                                  <div className="flex-1 pl-1 flex items-center">
                                    <div className="px-2 rounded-full bg-[#F3F3F3] text-[9px] font-normal  text-[#989898]">
                                      {nodeResultData.length - executeIndex} / {nodeResultData.length}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Prompt 文本 */}
                              <div className="p-1">
                                <div className="text-[10px] font-normal text-[#989898] line-clamp-2">
                                  <Tooltip title={<div className="text-2.5 inline-block p-[10px] select-text whitespace-pre-wrap cursor-text text-justify">{`${singleExecuteResultsData?.[0]?.source_text || ""}`}</div>} getPopupContainer={() => anchorRef.current!} mouseEnterDelay={0.1}>
                                    <div className="w-full text-justify">{`${singleExecuteResultsData?.[0]?.source_text || ""}`}</div>
                                  </Tooltip>
                                </div>
                              </div>

                              {/* Prompt 执行结果 */}
                              {singleExecuteResultsData?.[0] &&
                                singleExecuteResultsData?.[0]?.result?.map((item, index: number) => {
                                  const displayStr = formatDisplayValue(item?.data || "");
                                  return (
                                    <div key={`${id}-${item?.id}-${index}`} className={`flex flex-col ${index !== 0 ? "mt-1" : ""}`}>
                                      <div
                                        className="grid w-full"
                                        style={{
                                          gridTemplateColumns: "repeat(1, minmax(0px, 1fr))",
                                        }}
                                      >
                                        <div className="text-card-foreground overflow-hidden shadow-none border-0 rounded-none bg-[#F3F3F3]">
                                          <div className="p-0 relative group h-auto">
                                            {/* Split 文本 */}
                                            <div className="relative h-auto p-1 pt-[28px]">
                                              <div className="w-full text-justify text-[12px] font-normal line-clamp-5 break-words whitespace-pre-wrap">
                                                {singleExecuteResultsData?.[0]?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS ? (
                                                  <div
                                                    className="text-[#989898] cursor-pointer"
                                                    onClick={(e) => {
                                                      if (singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS) return;
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleTextEdit(displayStr, executeIndex, index, item?.id, singleExecuteResultsData?.[0]?.node_exec_id);
                                                    }}
                                                  >{`${displayStr}`}</div>
                                                ) : (
                                                  <div className="text-[#C54949]">{`Error: ${displayStr}`}</div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Checkbox & 模型图标及名称 */}
                                            <div className="absolute top-1 left-1">
                                              <div className="flex items-center gap-1">
                                                <Checkbox
                                                  className="shrink-0 w-[15px] h-[15px]"
                                                  disabled={singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS || nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING}
                                                  checked={childSelectedStates[`${executeIndex - nodeResultData.length}_${index}`] || false}
                                                  onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    updateChildSelection(`${executeIndex - nodeResultData.length}_${index}`, checked);
                                                  }}
                                                />
                                                <div className="flex items-center justify-center h-[24px] bg-white/60 rounded-xl pl-2 pr-[10px] gap-1">
                                                  {getModelIcon(singleExecuteResultsData?.[0]?.model_icon_name, "w-4 h-4 block")}
                                                  <span className="text-[12px] leading-[15px] text-[#262626] font-normal">{singleExecuteResultsData?.[0]?.model_name || ""}</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* 复制 & 编辑 */}
                                            {singleExecuteResultsData?.[0]?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS && (
                                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <div className="flex items-center gap-1">
                                                  <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Copy</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                                                    <div
                                                      className={`h-[24px] w-[24px] rounded-[3px] !p-0 hover bg-[#FFFFFF] outline outline-1 outline-[#989898] hover:outline-[#000000] text-[#989898] hover:text-[#000000] ${
                                                        singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS ? " opacity-50 cursor-not-allowed" : " cursor-pointer"
                                                      }`}
                                                      aria-disabled={singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS}
                                                      onClick={(e) => {
                                                        if (singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS) return;
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleTextCopy(displayStr);
                                                      }}
                                                    >
                                                      <EditorNodes_NodeExecuteResult_Copy_Svg className="block" color="currentColor" />
                                                    </div>
                                                  </Tooltip>
                                                  <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Edit</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                                                    <div
                                                      className={`h-[24px] w-[24px] rounded-[3px] !p-0 hover bg-[#FFFFFF] ${isEditHovered ? " outline outline-1 outline-[#000000]" : " outline outline-1 outline-[#989898]"} ${
                                                        singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS ? " opacity-50 cursor-not-allowed" : " cursor-pointer"
                                                      }`}
                                                      aria-disabled={singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS}
                                                      onClick={(e) => {
                                                        if (singleExecuteResultsData?.[0]?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS) return;
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleTextEdit(displayStr, executeIndex, index, item?.id, singleExecuteResultsData?.[0]?.node_exec_id);
                                                      }}
                                                      onMouseEnter={() => setIsEditHovered(true)}
                                                      onMouseLeave={() => setIsEditHovered(false)}
                                                    >
                                                      <EditorNodes_NodeExecuteResult_Edit_Svg className="block" color={isEditHovered ? "#000000" : "#989898"} />
                                                    </div>
                                                  </Tooltip>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        })
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-center text-[16px]">No Results</div>
                  )}
                </ThinScrollbar>
              </div>
            </div>
          </div>

          {/* Handle连接点 - 右侧输出 */}
          <div className="absolute left-[302px] w-[52px] h-auto">
            {InputNodeModel?.handle?.target?.map((item, index) => {
              const outputHandleType = item.key;
              const handleColor = outputHandleType ? BlockMeta[outputHandleType]?.color ?? "#000" : "#000";

              return (
                <div key={`${id}-handleTarget-${index}`} className="absolute w-[52px] h-[36px] flex flex-col justify-center" style={{ top: `${index * (20 + 36) + 45}px` }}>
                  <div className="relative flex flex-col items-center w-[52px]">
                    <div className="flex flex-col items-center relative">
                      <Handle type="source" position={Position.Right} id={`${outputHandleType}_${index}_${item.isMulti}`} className="!absolute !w-[36px] !h-[36px] !-translate-y-1/2 !border-none !rounded-full !z-[99] !opacity-0 !pointer-events-auto !transition-colors !duration-200" />
                      <div className="flex flex-col items-center justify-center min-h-[36px]">
                        <div className="relative">
                          <Node_HandleSvg color={handleColor} isEmpty={Object.values(childSelectedStates).filter((v) => v).length <= 0} isLeft={false} />
                          <div className="absolute inset-0 flex items-center justify-end z-[2] pointer-events-none">
                            <div className={`flex items-center justify-center w-[36px] font-normal text-white ${Object.values(childSelectedStates).filter((v) => v).length > 0 ? "text-xs" : "text-[10px]"}`}>
                              <span>{Object.values(childSelectedStates).filter((v) => v).length > 0 ? Object.values(childSelectedStates).filter((v) => v).length : item.isMulti !== HandleIsMulti.MULTI ? item.key : `${item.key}s`}</span>
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

        {/* 文本编辑Modal */}
        <Modal
          title={<div className="flex items-center p-[20px] text-[20px] leading-[22px] font-bold text-[#0D0D0D] border-b-[1px] border-[#E9E9E9]">Edit Content</div>}
          open={editModalOpen}
          onCancel={handleEditCancel}
          footer={
            <div className="flex justify-end gap-3 p-[20px] border-t-[1px] border-[#E9E9E9]">
              <Button onClick={handleEditCancel} className="w-[92px] h-[32px] rounded-[5px] text-[12px] font-bold text-[#0D0D0D] border border-[#E9E9E9] hover:border-[#000000]">
                Cancel
              </Button>
              <Button type="primary" onClick={handleEditConfirm} className="w-[92px] h-[32px] rounded-[5px] bg-[#35C838] hover:opacity-90 text-[12px] font-bold text-[#FFFFFF]">
                Confirm
              </Button>
            </div>
          }
          width={528}
          centered
          closeIcon={
            <div className="text-[#989898] hover:text-[#0D0D0D]">
              <EditorNodes_ModelClose_Svg className="block" color="currentColor" />
            </div>
          }
          className="node-textsplit-modal-container"
          rootClassName="node-textsplit-modal"
          classNames={{
            body: "node-textsplit-modal-content",
          }}
        >
          <div className="p-[20px]">
            <div className="p-1 border border-[#E9E9E9] rounded-[4px]">
              <TextArea
                className={`
                  w-full
                  h-[364px]
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
                  // min-h-[198px] max-h-[432px]
                `}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoSize={{ minRows: 10, maxRows: 20 }}
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default memo(NodeTextSpliter);
