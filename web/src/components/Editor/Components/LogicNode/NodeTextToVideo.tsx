/**
 * 文生视频 Text-To-Video 节点组件
 */
import React, { memo, useState, useRef, useCallback, useEffect, useContext } from "react";
import { Handle, Position, NodeResizer as _NodeResizer, useReactFlow } from "@xyflow/react";
import { Button, Select, Checkbox, Skeleton, App, Tooltip } from "antd";
import { customAlphabet } from "nanoid";
import { getNodeModelsByType, NodeTemplateType, BlockMeta, HandleIsMulti } from "../../Dict/dict";
import useStore from "../../Store/store";
import { NodeTemplateDetail, CONTROL_TAG, NODE_EXECUTE_STATUS, NodeExectionSSEDataGroup, NODE_EXECUTE_STATUS_CODE, WorkflowNodeExecuteResult } from "../../Types/types";
import { breaticFetchEventSourceWithAuth } from "../../../../api/breaticFetch";
import dashboardApi from "../../../../api/workflowApi";
import { aspectRatioType, videoModelType, tipsType, durationType } from "../../Types/nodeControlType";
import { NodeTextToVideoRuntimeData, getResultsForRunning, useUpstreamInputs, SelectedResultsType, selectedResultInfo, HandleType, NodeVideoInputRuntimeData } from "../../Types/runtimeData";
import { NodeTextToVideoResultData } from "../../Types/resultData";
import LoadingSkeletonCard from "../../../common/LoadingSkeletonCard";
import {
  EditorNodes_NodeExecuteCredit_Svg,
  EditorNodes_NodeExecuteReadyHoverStatus_Svg,
  EditorNodes_NodeExecuteReadyStatus_Svg,
  EditorNodes_NodeExecuteResult_Copy_Svg,
  EditorNodes_NodeExecuteResult_Download_Svg,
  EditorNodes_NodeExecuteRunningStatus_Svg,
  EditorNodes_NodeExecuteTime_Svg,
  EditorNodes_NodeExecuteWaitStatus_Svg,
  EditorNodes_TooltipSvg,
  Node_HandleSvg,
  NodeSelectComponent_SuffixSvg,
} from "../../SvgLoader/staticIcon";
import { getNodeIcon } from "../../SvgLoader/nodeIcon";
import NodeToolbarManager from "../Common/NodeToolbarManager";
import { getModelIcon } from "../../SvgLoader/modelIcon";
import { ThinScrollbar } from "../SceneEditor/VideoEditor/utils/Scrollbar";
import { UserContexts } from "../../../../contexts/user-contexts";

const uuid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 5);
const COMPONMENT_TITLE = "Batch Text-to-Video";
function NodeTextToVideo({ id, type, selected }: { id: string; type: NodeTemplateType; selected: boolean }) {
  /**
   * Store数据
   */
  //#region
  // 打印用来显示 Store
  const nodeResultData = useStore((s) => s.nodeResultData?.[id]) || [];
  const setNodeRuntimeData = useStore((s) => s.setNodeRuntimeData);
  const setNodeResultData = useStore((s) => s.setNodeResultData);
  const setNodeRuntimeDataByKey = useStore((s) => s.setNodeRuntimeDataByKey);
  const setNodeSelectedResultData = useStore((s) => s.setNodeSelectedResultData);
  const addNode = useStore((s) => s.addNode);

  const nodeTemplateData = useStore.getState().nodeTemplateData?.find((item) => item.template_code === Number(type)) || ({} as NodeTemplateDetail);
  //#endregion

  const nodeRuntimeData = useStore((s) => s.nodeRuntimeData?.[id]);

  useEffect(() => {
    if (!nodeRuntimeData) return;
    console.log("NodeTextToVideo Store", nodeRuntimeData);
  }, [nodeRuntimeData]);

  /**
   * 初始化组件状态
   */
  //#region
  const { message: messageApi } = App.useApp();

  const InputNodeModel = getNodeModelsByType(type);

  // 节点执行状态
  const [nodeExecuteState, setNodeExecuteState] = useState(NODE_EXECUTE_STATUS.WAIT);
  // 视频模型索引
  const [modelIndex, setModelIndex] = useState(0);
  // 模型选项列表
  const [modelOptions, setModelOptions] = useState<videoModelType[]>([]);

  // 宽高比索引
  const [aspectRatioIndex, setAspectRatioIndex] = useState(0);

  // 宽高比列表
  const [aspectRatioList, setAspectRatioList] = useState<aspectRatioType[]>([]);

  // 时长索引
  const [durationIndex, setDurationIndex] = useState(0);

  // 时长列表
  const [durationList, setDurationList] = useState<durationType[]>([]);

  // 宽高比
  const aspectRatio = "16 / 9";

  // 提示信息
  const [tips, setTips] = useState<tipsType>({ content: "", items: [] });

  const modelDatas = nodeTemplateData?.content?.[CONTROL_TAG.IMAGE_MODEL] || [],
    tipsData = nodeTemplateData?.content?.[CONTROL_TAG.TIPS] || {};

  // 当前节点执行完整骨架屏数据
  const [currentNodeExecuteFullSkeletonData, setCurrentNodeExecuteFullSkeletonData] = useState<NodeTextToVideoResultData[]>([]);

  // 上游数据
  const { counter, handleCounters } = useUpstreamInputs(id);

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
  const [isCopyHovered, setIsCopyHovered] = useState(false);
  const [isDownloadHovered, setIsDownloadHovered] = useState(false);

  // 用来挂载下拉框弹出项
  const anchorRef = useRef<HTMLDivElement>(null);

  const { getNodes } = useReactFlow();

  const resultListRef = useRef<any>(null); // 结果列表容器

  // 当前播放的结果视频引用 (用于互斥播放)
  const currentPlayingResultVideoRef = useRef<HTMLVideoElement | null>(null);

  const { refreshCredits } = useContext(UserContexts);
  //#endregion

  /**
   * UseEffect
   */
  //#region
  useEffect(() => {
    return () => {
      // 组件卸载时主动断开 SSE
      sseAbortRef.current?.abort();
      sseAbortRef.current = null;
    };
  }, []);

  // 初始化数据： 比例下拉列表项数据、视频模型下拉列表项数据、提示信息
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

    // 比例 下拉列表选项
    const aspectRatioDatas = modelDatas?.[modelIndex]?.[CONTROL_TAG.ASPECT_RATIO] || [];
    const aspectRatioSelectOptions = () => {
      if (!aspectRatioDatas || !Array.isArray(aspectRatioDatas)) {
        return [];
      }

      // 映射到组件使用的结构
      return aspectRatioDatas.map((item: any, index: number) => ({
        value: index.toString(),
        label: <span>{item.label}</span>,
      }));
    };

    // 时长 下拉列表选项
    const durationDatas = modelDatas?.[modelIndex]?.[CONTROL_TAG.DURATION] || [];
    const durationSelectOptions = () => {
      if (!durationDatas || !Array.isArray(durationDatas)) {
        return [];
      }

      // 映射到组件使用的结构
      return durationDatas.map((item: any, index: number) => ({
        value: index.toString(),
        label: <span>{item.label}</span>,
      }));
    };
    setModelOptions(llmsModelSelectOptions());
    setAspectRatioList(aspectRatioSelectOptions());
    setDurationList(durationSelectOptions());
    setTips(tipsData);
  }, [modelDatas, tipsData]);

  // 初始化数据：比例列表选中值、模型选中值
  useEffect(() => {
    const nodeRuntimeData = useStore.getState().nodeRuntimeData?.[id];
    if (!nodeRuntimeData) {
      // 新建空节点数据初始化
      const currentNodeRuntimeData: NodeTextToVideoRuntimeData = {
        modelIndex: 0,
        aspectRatioIndex: 0,
        durationIndex: 0,
        title: COMPONMENT_TITLE,
      };
      setNodeRuntimeData(id, currentNodeRuntimeData);

      const currentNodeSelectedResultData: selectedResultInfo = {
        counter: 0,
        selectedResultsType: SelectedResultsType.ID,
        selectedResults: {},
      };
      setNodeSelectedResultData(id, currentNodeSelectedResultData);

      // 依据当前的模型索引，变更比率数据
      const aspectRatioDatas = modelDatas[Number(currentNodeRuntimeData.modelIndex)].aspect_ratio;
      const aspectRatioSelectOptions = () => {
        if (!aspectRatioDatas || !Array.isArray(aspectRatioDatas)) {
          return [];
        }

        // 映射到组件使用的结构
        return aspectRatioDatas.map((item: any, index: number) => ({
          value: index.toString(),
          label: item.label,
        }));
      };
      setAspectRatioList(aspectRatioSelectOptions);

      // 依据当前的模型索引，变更时长数据
      const durationDatas = modelDatas[Number(currentNodeRuntimeData.modelIndex)].duration;
      const durationSelectOptions = () => {
        if (!durationDatas || !Array.isArray(durationDatas)) {
          return [];
        }

        // 映射到组件使用的结构
        return durationDatas.map((item: any, index: number) => ({
          value: index.toString(),
          label: item.label,
        }));
      };
      setDurationList(durationSelectOptions);

      setAspectRatioIndex(currentNodeRuntimeData.aspectRatioIndex);
      setDurationIndex(currentNodeRuntimeData.durationIndex);
      setModelIndex(currentNodeRuntimeData.modelIndex);
    } else {
      // 节点执行结果的数据初始化
      setAspectRatioIndex(nodeRuntimeData.aspectRatioIndex);
      setDurationIndex(nodeRuntimeData.durationIndex);
      setModelIndex(nodeRuntimeData.modelIndex);
      setTitle(nodeRuntimeData.title);

      // 重置AspectRatio
      const aspectRatioDatas = modelDatas[Number(nodeRuntimeData.modelIndex)].aspect_ratio;
      const aspectRatioSelectOptions = () => {
        if (!aspectRatioDatas || !Array.isArray(aspectRatioDatas)) {
          return [];
        }

        // 映射到组件使用的结构
        return aspectRatioDatas.map((item: any, index: number) => ({
          value: index.toString(),
          label: item.label,
        }));
      };
      setAspectRatioList(aspectRatioSelectOptions);

      // 重置Duration
      const durationDatas = modelDatas[Number(nodeRuntimeData.modelIndex)].duration;
      const durationSelectOptions = () => {
        if (!durationDatas || !Array.isArray(durationDatas)) {
          return [];
        }

        // 映射到组件使用的结构
        return durationDatas.map((item: any, index: number) => ({
          value: index.toString(),
          label: item.label,
        }));
      };
      setDurationList(durationSelectOptions);

      const nodeSelectedResultData = useStore.getState().nodeSelectedResultData?.[id];
      // 初始化子项选中状态
      const selectedResults = nodeSelectedResultData?.selectedResults || {};
      const parsedSelectedResults = parseStoreSelectedStatesToState(selectedResults);

      setChildSelectedStates(parsedSelectedResults);
    }
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
  //#endregion

  /**
   * 事件管理
   */
  //#region

  // 大模型数据下拉列表选项 选择事件
  const handleModelSelect = useCallback(
    (value: string) => {
      setNodeRuntimeDataByKey(id, "modelIndex", Number(value));
      setModelIndex(Number(value));

      // 重置AspectRatio
      const aspectRatioDatas = modelDatas[Number(value)].aspect_ratio;
      const aspectRatioSelectOptions = () => {
        if (!aspectRatioDatas || !Array.isArray(aspectRatioDatas)) {
          return [];
        }

        // 映射到组件使用的结构
        return aspectRatioDatas.map((item: any, index: number) => ({
          value: index.toString(),
          label: item.label,
        }));
      };

      setAspectRatioList(aspectRatioSelectOptions);
      setAspectRatioIndex(0);
      setNodeRuntimeDataByKey(id, "aspectRatioIndex", 0);

      // 充值duration数据
      const durationDatas = modelDatas[Number(value)].duration;
      const durationSelectOptions = () => {
        if (!durationDatas || !Array.isArray(durationDatas)) {
          return [];
        }

        // 映射到组件使用的结构
        return durationDatas.map((item: any, index: number) => ({
          value: index.toString(),
          label: item.label,
        }));
      };
      setDurationList(durationSelectOptions);
      setDurationIndex(0);
      setNodeRuntimeDataByKey(id, "durationIndex", 0);
    },
    [id]
  );

  // AspectRatio 下拉列表选项 选择事件
  const handleAspectRatioSelect = useCallback(
    (value: string, _options: any) => {
      setNodeRuntimeDataByKey(id, "aspectRatioIndex", Number(value));
      setAspectRatioIndex(Number(value));
    },
    [id]
  );

  // Duration 下拉列表选项 选择事件
  const handleDurationSelect = useCallback(
    (value: string, _options: any) => {
      setNodeRuntimeDataByKey(id, "durationIndex", Number(value));
      setDurationIndex(Number(value));
    },
    [id]
  );

  /**
   * 平滑滚动到顶部
   * @param scrollbars 滚动条实例
   * @param duration 滚动持续时间（毫秒）
   *  根据常见 UI/UX 规范（Material、iOS、Web 交互经验），常用时间如下：
   *  场景	                      推荐时长
   *  短滚动距离（100 ~ 400px）	    200–300ms
   *  中等滚动距离（400 ~ 1000px）	300–500ms
   *  长距离滚动到顶部          	  500–800ms 最顺眼
   *  超长页面（聊天记录、日志）	    动态时长，而不是固定
   */
  function smoothScrollToTop(scrollbars: any, duration = 600) {
    if (!scrollbars) return;
    const el = scrollbars.view; // 真实 DOM

    if (!el) return;

    const start = el.scrollTop;
    const startTime = performance.now();

    // 缓动（easing）函数
    function easeInOutQuad(t: number) {
      // 当 t 从 0 → 0.5 时采用加速曲线（2*t*t）
      // 当 t 从 0.5 → 1 时采用减速曲线（-1 + (4 - 2*t)*t）
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    // 动画帧回调
    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOutQuad(t);

      const target = start * (1 - eased);
      scrollbars.scrollTop(target);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  interface VideoBasedBlocks {
    source_text: string[];
    ratio?: string | number;
    duration?: string | number;
    resolution?: string | number;
  }

  interface RequestParams {
    model_id: string | number;
    template_code: number;
    video_based_blocks: VideoBasedBlocks;
    id: string | number;
    flow_id: string | number;
    extra_info: {
      model_name: string;
      model_icon_name: string;
    };
  }
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
      const skeletonResults = Array.from({ length: counter }, (_, i) => ({
        index: i,
        id: "",
        result: "",
        status_code: NODE_EXECUTE_STATUS_CODE.SUCCESS,
        source_text: sourceText[i],
        source_video: "",
        credits: 0,
        exec_time: 0,
        create_time: 0,
        node_exec_id: "",
        model_id: modelDatas[modelIndex].value,
        model_name: modelDatas[modelIndex].label,
        model_icon_name: modelDatas[modelIndex].icon_name,
      }));

      setCurrentNodeExecuteFullSkeletonData(skeletonResults);
    }

    // 若存在上一条连接，先断开
    sseAbortRef.current?.abort();
    const controller = new AbortController();
    sseAbortRef.current = controller;

    // 获取AspectRatio值
    const aspectRatioDatas = modelDatas[Number(modelIndex)].aspect_ratio;
    // 获取Duration值
    const durationDatas = modelDatas[Number(modelIndex)]?.duration;

    // 根据节点类型构建请求参数
    const workflowId = useStore.getState().workflowInfo.id,
      updateToken = useStore.getState().updateToken;
    const buildRequestParams = () => {
      let currentRequestParams: RequestParams = {
        model_id: modelDatas[modelIndex].value,
        template_code: Number(NodeTemplateType.TEXT_TO_VIDEO),
        video_based_blocks: {
          source_text: sourceText,
        },
        id: id,
        flow_id: workflowId,
        extra_info: {
          model_name: modelDatas[modelIndex].label,
          model_icon_name: modelDatas[modelIndex].icon_name,
        },
      };

      if (aspectRatioDatas) currentRequestParams.video_based_blocks.ratio = aspectRatioDatas[aspectRatioIndex].value;
      if (durationDatas) currentRequestParams.video_based_blocks.duration = durationDatas[durationIndex]?.value;

      return currentRequestParams;
    };

    let requestParams: any = {};
    requestParams = buildRequestParams();
    console.log("NodeTextToVideo handleNodeExecuteClickEvent 构建的请求参数:", requestParams);

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
        console.log("NodeTextToVideo handleNodeExecuteClickEvent SSE 消息:", ev);
        try {
          if (ev.event === "abort") {
            stopReason = "abort";

            setNodeExecuteState(NODE_EXECUTE_STATUS.READY);
            sseAbortRef.current?.abort();
            sseAbortRef.current = null;

            // TOTO: 同步Error 信息
            let errorData: any = {};
            try {
              errorData = JSON.parse(ev.data); // 服务端推送的 JSON
              messageApi.error(errorData.msg);

              setCurrentNodeExecuteFullSkeletonData((prev) =>
                prev.map((item) => {
                  return {
                    ...item,
                    result: errorData?.msg,
                    status_code: errorData?.code,
                  };
                })
              );
            } catch (parseErr) {
              console.error("SSE message JSON parse error", parseErr);
              return;
            }
          } else if (ev.event === "error") {
            stopReason = "error";
            setNodeExecuteState(NODE_EXECUTE_STATUS.READY);
            sseAbortRef.current?.abort();
            sseAbortRef.current = null;

            // 同步Error 信息
            try {
              const errorMsg = JSON.parse(ev.data).msg;
              messageApi.error(errorMsg);
            } catch (error) {
              console.error("SSE error JSON parse error", error);
              return;
            }
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

            // 替换骨架屏数据
            setCurrentNodeExecuteFullSkeletonData((prev) =>
              prev.map((item) => {
                if (item.index === nodeExecutionResulDataRow.exec_result.index) {
                  const exec = nodeExecutionResulDataRow.exec_result || {};
                  const content = nodeExecutionResulDataRow.node_content || {};
                  const node_exec_id = nodeExecutionResulDataRow.node_exec_id || "";

                  return {
                    ...item,
                    id: exec.id ?? item.id ?? "",
                    result: (exec.result as string) ?? exec?.msg ?? item.result ?? "",
                    status_code: exec.status_code ?? NODE_EXECUTE_STATUS_CODE.SUCCESS,
                    source_text: exec.source_text ?? item.source_text ?? "",
                    credits: exec.credits ?? item.credits ?? 0,
                    exec_time: exec.exec_time ?? item.exec_time ?? 0,
                    create_time: exec.create_time ?? item.create_time ?? Date.now(),
                    node_exec_id: node_exec_id ?? "",
                    model_id: content?.model_id ?? item?.model_id ?? "",
                    model_name: content?.extra_info?.model_name ?? item?.model_name ?? "",
                    model_icon_name: content?.extra_info?.model_icon_name ?? item?.model_icon_name ?? "",
                  };
                }
                return item;
              })
            );
          } else if (ev.event == "done") {
            if (stopReason === "normal") {
              // 一次性拉取当前节点的所有执行结果 -> UI 数据转换 -> 存入逻辑区
              (async () => {
                try {
                  const res = await dashboardApi.getNodeExecuteResult(id, workflowId, updateToken);

                  // UI 数据转换
                  if (res.success && res.result?.code === 0) {
                    const nodeData = res.result.data as WorkflowNodeExecuteResult[];

                    const nodeAllResultData: any[][] = [];

                    for (const item of nodeData) {
                      const { WorkflowNodeExec } = item;
                      if (!WorkflowNodeExec) {
                        nodeAllResultData.push([]);
                        continue;
                      }

                      const { exec_result = [], node_content, id: node_exec_id = "" } = WorkflowNodeExec;

                      const content = node_content ?? {};
                      const extraInfo = content.extra_info ?? {};

                      const nodeBatchResultData: any[] = [];

                      for (const exec of exec_result) {
                        const isValidAudio = typeof exec.result === "string" && exec.result.startsWith("http");

                        nodeBatchResultData.push({
                          id: exec.id,
                          result: exec.result,
                          status_code: isValidAudio ? NODE_EXECUTE_STATUS_CODE.SUCCESS : exec.status_code ?? NODE_EXECUTE_STATUS_CODE.ERROR,
                          source_text: exec.source_text,
                          credits: exec.credits,
                          exec_time: exec.exec_time,
                          create_time: exec.create_time,
                          node_exec_id,
                          model_id: content.model_id,
                          model_name: extraInfo.model_name,
                          model_icon_name: extraInfo.model_icon_name,
                        });
                      }

                      nodeAllResultData.push(nodeBatchResultData);
                    }

                    // 写入完整数据到Store
                    setNodeResultData(id, nodeAllResultData);
                  } else {
                    if (res.result?.msg) {
                      messageApi.error(res.result.msg);
                    }
                  }
                } catch (e) {
                  console.error("查询执行结果失败", e);
                } finally {
                  // 跳转到指定的锚点
                  smoothScrollToTop(resultListRef.current);

                  // 刷新积分
                  refreshCredits();

                  // 变更执行状态
                  setNodeExecuteState(NODE_EXECUTE_STATUS.READY);
                }
              })();
            }

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

  // 获取当前执行结果数据块有效子项 key
  const getParentSelectableKeys = useCallback(
    (pIndex: number) => {
      if (nodeResultData.length === 0) return [];

      const keys: string[] = [];
      nodeResultData.forEach((singleExecuteResultsData: NodeTextToVideoResultData[], executeIndex: number) => {
        if (executeIndex !== pIndex) return;
        singleExecuteResultsData.forEach((item, index) => {
          // 只有成功状态的项目才能被选择
          if (item?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS) {
            keys.push(`${executeIndex - nodeResultData.length}_${index}`);
          }
        });
      });
      return keys;
    },
    [nodeResultData]
  );

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
        [parentIndex]: validSelected ? validSelected.length : 0,
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
      selectedResultsType: SelectedResultsType.ID,
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

    nodeResultData?.map((item: any, index: number) => {
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

      item.forEach((item: any, itemIndex: number) => {
        context[`${parentIndex}_${itemIndex}`] = selectResultsWithoutBatchStr[parentIndex]?.includes(itemIndex) || false;
      });
      return;
    });

    return context;
  };

  //#endregion

  // 解析文件名
  const getFileNameFromUrl = (url: string): string | undefined => {
    try {
      const u = new URL(url);
      const pathname = u.pathname;
      const name = pathname.substring(pathname.lastIndexOf("/") + 1);
      return name || undefined;
    } catch {
      return undefined;
    }
  };

  // 单个图片下载
  const handleDownload = async (url: string, filename?: string) => {
    if (!url) {
      console.error("下载失败: URL 为空");
      throw new Error("URL 为空");
    }

    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) {
        throw new Error(`HTTP 错误: ${res.status} ${res.statusText}`);
      }
      const blob = await res.blob();

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || getFileNameFromUrl(url) || `image_${Date.now()}`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("下载失败:", err);
      throw err;
    }
  };

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
   * 单个视频复制
   * @param url 视频 URL
   */
  const handleVideoCopy = (url: string) => {
    if (!url) {
      console.error("复制失败: URL 为空");
      throw new Error("URL 为空");
    }

    const nodes = getNodes();
    const current = nodes.find((n) => n.id === id);
    const basePos = current ? { x: current.position.x + 610, y: current.position.y } : { x: 200, y: 200 };

    const newNodeId = `${NodeTemplateType.VIDEO_INPUT}-${Date.now()}-${uuid()}`;
    const newNode = {
      id: newNodeId,
      type: NodeTemplateType.VIDEO_INPUT,
      position: basePos,
      data: { type: "input", label: "Video" },
    } as any;

    addNode(newNode);

    const runtimeData: NodeVideoInputRuntimeData = {
      videoUrl: url,
      uploadSuccess: true,
      title: "Video",
    } as any;
    setNodeRuntimeData(newNodeId, runtimeData);
    setNodeSelectedResultData(newNodeId, {
      counter: 1,
      selectedResultsType: SelectedResultsType.URL,
      selectedResults: [url],
    });
  };

  /**
   * 视频播放事件处理 (互斥播放)
   * @param e 视频元素事件
   */
  const handlePlay = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    if (currentPlayingResultVideoRef.current && currentPlayingResultVideoRef.current !== video) {
      currentPlayingResultVideoRef.current.pause();
    }
    currentPlayingResultVideoRef.current = video;
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

          {/* 节点主体内容 */}
          <div className="w-full">
            {/* 节点左侧：标题、模型选择、比率选择、执行按钮 */}
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
                      classNames={{ root: "node-texttovideo-tooltip" }}
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
                {/* 模型选择部分 */}
                <div className="space-y-2 nodrag" style={{ position: "relative", zIndex: 10 }}>
                  <div className="flex items-center">
                    <span className="text-[10px] font-bold ">Select model</span>
                  </div>
                  <Select
                    suffixIcon={<NodeSelectComponent_SuffixSvg />}
                    value={modelIndex.toString()}
                    onChange={handleModelSelect}
                    className="node-workflow w-full"
                    classNames={{
                      popup: {
                        root: "node-texttovideo-modals-select",
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

                {/* 比率选择部分 */}
                <div className="space-y-2 nodrag" style={{ position: "relative", zIndex: 10 }}>
                  <div className="flex items-center mt-[12px]">
                    <span className="text-[10px] font-bold ">Aspect Ratio</span>
                  </div>
                  <Select
                    suffixIcon={<NodeSelectComponent_SuffixSvg />}
                    value={aspectRatioIndex.toString()}
                    onChange={handleAspectRatioSelect}
                    className="node-workflow w-full"
                    classNames={{
                      popup: {
                        root: "node-texttovideo-aspectratio-select",
                      },
                    }}
                    size="large"
                    options={aspectRatioList}
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

                {/* 时长选择部分 */}
                <div className="space-y-2 nodrag" style={{ position: "relative", zIndex: 10 }}>
                  <div className="flex items-center mt-[12px]">
                    <span className="text-[10px] font-bold ">Duration</span>
                  </div>
                  <Select
                    suffixIcon={<NodeSelectComponent_SuffixSvg />}
                    value={durationIndex.toString()}
                    onChange={handleDurationSelect}
                    className="node-workflow w-full"
                    classNames={{
                      popup: {
                        root: "node-texttovideo-duration-select",
                      },
                    }}
                    size="large"
                    options={durationList}
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
                      {nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING && currentNodeExecuteFullSkeletonData?.length > 0 ? (
                        <>
                          {/* 骨架屏 + nodeResultData */}
                          {/* 1 骨架屏部分 */}
                          <div className="border-box border border-[#E9E9E9] p-1 rounded-[5px]">
                            {/* 数据块勾选 +查看 */}
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
                            {currentNodeExecuteFullSkeletonData.map((item, sourceIndex) => {
                              // 数据节点的有效counter，遍历骨架屏
                              return (
                                <div key={`${id}-SkeletonTop-${sourceIndex}`} className={`flex flex-col ${sourceIndex !== 0 ? "mt-1" : ""}`}>
                                  <div className="p-1">
                                    <div className="text-[10px] font-normal text-[#989898] line-clamp-2">
                                      <Tooltip title={<div className="text-2.5 inline-block p-[10px] whitespace-pre-wrap select-text cursor-text text-justify">{`${item?.source_text || ""}`}</div>} getPopupContainer={() => anchorRef.current!} mouseEnterDelay={0.1}>
                                        <div className="w-full text-justify">{`${item?.source_text || ""}`}</div>
                                      </Tooltip>
                                    </div>
                                  </div>
                                  <div
                                    className="grid w-full"
                                    style={{
                                      gridTemplateColumns: "repeat(1, minmax(0px, 1fr))",
                                    }}
                                  >
                                    <div className="text-card-foreground overflow-hidden shadow-none border-0 rounded-none" draggable="true">
                                      <div className="p-0 relative group h-auto">
                                        <div
                                          className="overflow-hidden bg-[#F3F3F3] w-[282px] h-[159px]"
                                          style={{
                                            aspectRatio: aspectRatio,
                                          }}
                                        >
                                          <div
                                            className="absolute top-0 left-0  w-[282px] h-[159px] cursor-pointer overflow-hidden bg-[#F3F3F3]"
                                            style={{
                                              aspectRatio: aspectRatio,
                                            }}
                                          >
                                            {item?.result ? (
                                              <>
                                                {item?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS ? (
                                                  <video
                                                    draggable="false"
                                                    className="absolute inset-0 w-[282px] h-[159px] object-contain rounded-0 select-none"
                                                    style={{ aspectRatio: aspectRatio }}
                                                    key={item?.result}
                                                    src={item?.result || ""}
                                                    controls
                                                    playsInline
                                                    preload="metadata"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      e.preventDefault();
                                                    }}
                                                    onPlay={handlePlay}
                                                  />
                                                ) : (
                                                  <div className="absolute flex items-center inset-0 w-[282px] h-[159px] select-none px-1 pt-[20px] pb-1">
                                                    <div className="line-clamp-6 break-words text-[#C54949]">{`Error: ${item?.result || ""}`}</div>
                                                  </div>
                                                )}
                                              </>
                                            ) : (
                                              <LoadingSkeletonCard aspectRatio={aspectRatio} />
                                            )}
                                          </div>
                                        </div>
                                        <div className="absolute top-1 left-1">
                                          <div className="flex items-center gap-1">
                                            {item?.result && (
                                              <>
                                                <Checkbox className="shrink-0 w-[15px] h-[15px]" disabled={nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING || item?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS} />
                                                <div className="flex items-center justify-center h-[24px] bg-white/60 rounded-xl pl-2 pr-[10px] gap-1">
                                                  {getModelIcon(item?.model_icon_name, "w-4 h-4 block")}
                                                  <span className="text-[12px] leading-[15px] text-[#262626] font-normal">{item?.model_name || ""}</span>
                                                </div>
                                              </>
                                            )}
                                          </div>
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
                            nodeResultData?.map((singleExecuteResultsData: NodeTextToVideoResultData[], executeIndex: number) => {
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
                                  {singleExecuteResultsData &&
                                    singleExecuteResultsData?.map((item, index: number) => {
                                      return (
                                        <div key={`${id}-${item?.node_exec_id}-${index}`} className={`flex flex-col ${index !== 0 ? "mt-1" : ""}`}>
                                          <div className="p-1">
                                            <div className="text-[10px] font-normal text-[#989898] line-clamp-2">
                                              <Tooltip title={<div className="text-2.5 inline-block p-[10px] whitespace-pre-wrap select-text cursor-text text-justify">{`${item?.source_text || ""}`}</div>} getPopupContainer={() => anchorRef.current!} mouseEnterDelay={0.1}>
                                                <div className="w-full text-justify">{`${item?.source_text || ""}`}</div>
                                              </Tooltip>
                                            </div>
                                          </div>
                                          <div
                                            className="grid w-full"
                                            style={{
                                              gridTemplateColumns: "repeat(1, minmax(0px, 1fr))",
                                            }}
                                          >
                                            <div className="text-card-foreground overflow-hidden shadow-none border-0 rounded-none" draggable="true">
                                              <div className="p-0 relative group h-auto">
                                                <div
                                                  className="overflow-hidden w-[282px] h-[159px]"
                                                  style={{
                                                    aspectRatio: aspectRatio,
                                                  }}
                                                >
                                                  <div
                                                    className="absolute top-0 left-0  w-[282px] h-[159px] cursor-pointer overflow-hidden bg-[#F3F3F3]"
                                                    style={{
                                                      aspectRatio: aspectRatio,
                                                    }}
                                                  >
                                                    {item?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS ? (
                                                      <video
                                                        draggable="false"
                                                        className="absolute inset-0 w-[282px] h-[159px] object-contain rounded-0 select-none"
                                                        style={{ aspectRatio: aspectRatio }}
                                                        key={item?.result}
                                                        src={item?.result || ""}
                                                        controls
                                                        playsInline
                                                        preload="metadata"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          e.preventDefault();
                                                        }}
                                                        onPlay={handlePlay}
                                                      />
                                                    ) : (
                                                      <div className="absolute flex items-center inset-0 w-[282px] h-[159px] select-none px-1 pt-[20px] pb-1">
                                                        <div className="line-clamp-6 break-words text-[#C54949]">{`Error: ${item?.result || ""}`}</div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="absolute top-1 left-1">
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      className="shrink-0 w-[15px] h-[15px]"
                                                      disabled={item?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS || nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING}
                                                      checked={childSelectedStates[`${executeIndex - nodeResultData.length}_${index}`] || false}
                                                    />
                                                    <div className="flex items-center justify-center h-[24px] bg-white/60 rounded-xl pl-2 pr-[10px] gap-1">
                                                      {getModelIcon(item?.model_icon_name, "w-4 h-4 block")}
                                                      <span className="text-[12px] leading-[15px] text-[#262626] font-normal">{item?.model_name || ""}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                                {item?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS && (
                                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <div className="flex items-center gap-1">
                                                      <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Copy</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                                                        <div className="h-[24px] w-[24px] rounded-[3px] !p-0 bg-[#FFFFFF] opacity-50 cursor-not-allowed" aria-disabled={true}>
                                                          <EditorNodes_NodeExecuteResult_Copy_Svg className="block" color="#989898" />
                                                        </div>
                                                      </Tooltip>
                                                      <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Download</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                                                        <div className="h-[24px] w-[24px] rounded-[3px] !p-0 bg-[#FFFFFF] opacity-50 cursor-not-allowed" aria-disabled={true}>
                                                          <EditorNodes_NodeExecuteResult_Download_Svg className="block" color="#989898" />
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
                        nodeResultData?.map((singleExecuteResultsData: NodeTextToVideoResultData[], executeIndex: number) => {
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
                              {singleExecuteResultsData &&
                                singleExecuteResultsData?.map((item, index: number) => {
                                  return (
                                    <div key={`${id}-${item?.id}-${index}`} className={`flex flex-col ${index !== 0 ? "mt-1" : ""}`}>
                                      <div className="p-1">
                                        <div className="text-[10px] font-normal text-[#989898] line-clamp-2">
                                          <Tooltip title={<div className="text-2.5 inline-block p-[10px] whitespace-pre-wrap select-text cursor-text text-justify">{`${item?.source_text || ""}`}</div>} getPopupContainer={() => anchorRef.current!} mouseEnterDelay={0.1}>
                                            <div className="w-full text-justify">{`${item?.source_text || ""}`}</div>
                                          </Tooltip>
                                        </div>
                                      </div>
                                      <div
                                        className="grid w-full"
                                        style={{
                                          gridTemplateColumns: "repeat(1, minmax(0px, 1fr))",
                                        }}
                                      >
                                        <div className="text-card-foreground overflow-hidden shadow-none border-0 rounded-none " draggable="true">
                                          <div className="p-0 relative group h-auto">
                                            <div
                                              className="overflow-hidden w-[282px] h-[159px]"
                                              style={{
                                                aspectRatio: aspectRatio,
                                              }}
                                            >
                                              <div
                                                className="absolute top-0 left-0  w-[282px] h-[159px] cursor-pointer overflow-hidden bg-[#F3F3F3]"
                                                style={{
                                                  aspectRatio: aspectRatio,
                                                }}
                                              >
                                                {item?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS ? (
                                                  <video
                                                    draggable="false"
                                                    className="absolute inset-0 w-[282px] h-[159px] object-contain rounded-0 select-none"
                                                    style={{ aspectRatio: aspectRatio }}
                                                    key={item?.result}
                                                    src={item?.result || ""}
                                                    controls
                                                    playsInline
                                                    preload="metadata"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      e.preventDefault();
                                                    }}
                                                    onPlay={handlePlay}
                                                  />
                                                ) : (
                                                  <div className="absolute flex items-center inset-0 w-[282px] h-[159px] select-none px-1 pt-[20px] pb-1">
                                                    <div className="line-clamp-6 break-words text-[#C54949]">{`Error: ${item?.result || ""}`}</div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div className="absolute top-1 left-1">
                                              <div className="flex items-center gap-1">
                                                <Checkbox
                                                  className="shrink-0 w-[15px] h-[15px]"
                                                  disabled={item?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS || nodeExecuteState === NODE_EXECUTE_STATUS.RUNNING}
                                                  checked={childSelectedStates[`${executeIndex - nodeResultData.length}_${index}`] || false}
                                                  onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    updateChildSelection(`${executeIndex - nodeResultData.length}_${index}`, checked);
                                                  }}
                                                />
                                                <div className="flex items-center justify-center h-[24px] bg-white/60 rounded-xl pl-2 pr-[10px] gap-1">
                                                  {getModelIcon(item?.model_icon_name, "w-4 h-4 block")}
                                                  <span className="text-[12px] leading-[15px] text-[#262626] font-normal">{item?.model_name || ""}</span>
                                                </div>
                                              </div>
                                            </div>
                                            {item?.status_code === NODE_EXECUTE_STATUS_CODE.SUCCESS && (
                                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <div className="flex items-center gap-1">
                                                  <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Copy</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                                                    <div
                                                      className={`h-[24px] w-[24px] rounded-[3px] !p-0 hover bg-[#FFFFFF] ${isCopyHovered ? " outline outline-1 outline-[#000000]" : " outline outline-1 outline-[#989898]"} ${
                                                        item?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS ? " opacity-50 cursor-not-allowed" : " cursor-pointer"
                                                      }`}
                                                      aria-disabled={item?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS}
                                                      onClick={(e) => {
                                                        if (item?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS) return;
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleVideoCopy(item?.result);
                                                      }}
                                                      onMouseEnter={() => setIsCopyHovered(true)}
                                                      onMouseLeave={() => setIsCopyHovered(false)}
                                                    >
                                                      <EditorNodes_NodeExecuteResult_Copy_Svg className="block" color={isCopyHovered ? "#000000" : "#989898"} />
                                                    </div>
                                                  </Tooltip>
                                                  <Tooltip title={<div className="flex items-center inline-block whitespace-nowrap max-w-none text-[10px] p-[10px]">Download</div>} mouseEnterDelay={0.1} getPopupContainer={() => anchorRef.current!}>
                                                    <div
                                                      className={`h-[24px] w-[24px] rounded-[3px] !p-0 hover bg-[#FFFFFF] ${isDownloadHovered ? " outline outline-1 outline-[#000000]" : " outline outline-1 outline-[#989898]"} ${
                                                        item?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS ? " opacity-50 cursor-not-allowed" : " cursor-pointer"
                                                      }`}
                                                      aria-disabled={item?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS}
                                                      onClick={(e) => {
                                                        if (item?.status_code !== NODE_EXECUTE_STATUS_CODE.SUCCESS) return;
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const name = getFileNameFromUrl(item?.result || "") || `image_${index}`;
                                                        handleDownload(item?.result || "", name);
                                                      }}
                                                      onMouseEnter={() => setIsDownloadHovered(true)}
                                                      onMouseLeave={() => setIsDownloadHovered(false)}
                                                    >
                                                      <EditorNodes_NodeExecuteResult_Download_Svg className="block" color={isDownloadHovered ? "#000000" : "#989898"} />
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
      </div>
    </div>
  );
}

export default memo(NodeTextToVideo);
