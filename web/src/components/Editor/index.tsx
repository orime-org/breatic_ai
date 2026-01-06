/**
 * Editor页面
 */
// 第三方组件引入
import { Layout, Spin } from "antd";
import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import "@xyflow/react/dist/style.css";
import { customAlphabet } from "nanoid";
import { useShallow } from "zustand/react/shallow";
import { type OnDelete, type NodeChange, type EdgeChange, type Connection, SelectionMode, ReactFlow, MiniMap, useReactFlow, ReactFlowProvider, ConnectionLineType, Edge, OnSelectionChangeParams, XYPosition } from "@xyflow/react";
import html2canvas from "html2canvas";

// 自定义组件引入
import "./editor.css";
import PannelLeftComponent from "./UI/PannelLeftConponents";
import UserCenter from "../UserCenter/index";
import PannelHomeComponent from "./UI/PannelHomeComponent";
import ZoomSlider from "./UI/ZoomSlider";
import { type AppState, type AppNode, type AppEdge, nodeTypes, edgeTypes, NodeTemplateDetail } from "./Types/types";
import useStore, { useUndoRedo } from "./Store/store";
import { NodeTemplateType, HandleIsMulti, getOutputHandleColorByTemplateType } from "./Dict/dict";
import { initNodeTemplateData, initWorkflowDetail } from "./Utils/initData";
import { AutoSaveWebSocket } from "./Utils/autoSaveWebSocket";
import { host } from "../../api/breaticFetch";
import editorApi from "../../api/editorApi";
import { IUserContexts, UserContexts } from "./../../contexts/user-contexts";
import { EditorContexts } from "./../../contexts/editor-contexts";
import authService from "../../libs/auth-service";

const { protocol: httpProtocol, host: hostWithPort } = new URL(host);
const WS_URL = `${httpProtocol === "https:" ? "wss" : "ws"}://${hostWithPort}/api/ws/workflow`;

// 全局变量
const nodeClassName = (node: any) => node.type;
const uuid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 5); // 示例："4f90D"
const selector = (state: AppState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  record: state.record,
  addNode: state.addNode,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  initializeHistory: state.initializeHistory,
  nodeRuntimeData: state.nodeRuntimeData,
  nodeSelectedResultData: state.nodeSelectedResultData,
  workflowInfo: state.workflowInfo,
});

let isNodeDraggingFirstSlice = true;
const AUTO_SAVE_DELAY = 3000;

/**
 * 连接验证器
 * @description 验证节点间连接是否符合业务规则和数据流约束
 *
 * ## 验证规则
 * - **连接桩完整性**: 检查源节点和目标节点的连接桩是否存在
 * - **节点有效性**: 验证连接的源节点和目标节点是否存在于画布中
 * - **自连接限制**: 禁止节点连接到自身（SOLO行为）
 * - **类型匹配**: 确保输出桩和输入桩的数据类型兼容
 * - **连接数量限制**: 根据输入桩配置限制连接数量
 *
 * ## 连接桩类型格式
 * 输入桩的 type 格式：`{数据类型}-{桩索引}-{数量限制}`
 *
 * **示例**: `image-0-1`
 * - `image`: 数据类型（image/text/video/audio）
 * - `0`: 桩索引（第0个输入桩）
 * - `1`: 数量限制（1表示只能接受一条连接，0表示无限制）
 *
 * @param edge 待验证的连接对象
 * @returns {boolean} 连接是否合法
 */
const useConnectionValidator = () => {
  const { getNode, getEdges } = useReactFlow();

  const isValidConnection = (edge: Connection | Edge): boolean => {
    const sourceHandle = edge.sourceHandle ?? null;
    const targetHandle = edge.targetHandle ?? null;

    // 1、连接桩完整性
    if (!sourceHandle || !targetHandle) return false;

    // 获取源节点和目标节点
    const sourceNode = getNode(edge.source);
    const targetNode = getNode(edge.target);

    // 2、节点有效性
    if (!sourceNode || !targetNode) return false;

    // 3、自连接限制
    if (edge.source === edge.target) return false;

    const sourceHandleType = sourceHandle?.split("_")[0];
    const targetHandleType = targetHandle?.split("_")[0];
    const targetHandleIsMulti = Number(targetHandle?.split("_")[2]) === HandleIsMulti.MULTI;

    // 4、类型匹配
    if (sourceHandleType !== targetHandleType) return false;

    const edges = getEdges();

    // 5、连接数量限制
    // 计算当前输入桩的连接数量
    const currentOutputConnections = edges.filter((e) => {
      let etargetHandleType = e.targetHandle?.split("_")[0];
      return e.target === edge.target && etargetHandleType === sourceHandleType;
    }).length;
    // 检查是否超过最大连接数
    if (!targetHandleIsMulti && currentOutputConnections >= 1) return false;

    return true;
  };

  return isValidConnection;
};

/**
 * 编辑器组件
 * @description 提供工作流编辑功能的主组件，包含画布、节点面板、连接验证等
 * @returns {React.ReactNode} 编辑器组件的渲染结果
 */
const Editor: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const wsRef = useRef<AutoSaveWebSocket | null>(null);

  // 用户信息
  const userContexts: IUserContexts = React.useContext<IUserContexts>(UserContexts);

  const { getViewport } = useReactFlow();

  // 连接验证器
  const isValidConnection = useConnectionValidator();
  // 自动保存定时器引用
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 保存操作引用
  const performSaveRef = useRef<(() => Promise<void>) | null>(null);

  // 自动截图定时器引用
  const autoCaptureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 截图目标 HTML 元素引用
  const reactflowContainerRef = useRef<HTMLDivElement>(null);

  // 保存状态引用
  const isSavingRef = useRef(false);
  const isCaptureSavingRef = useRef(false);
  // webWorker 是否有效
  const [workerAvailable, setWorkerAvailable] = useState(false);
  // 应用的状态
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, record, addNode, setNodes, setEdges, initializeHistory, nodeRuntimeData, nodeSelectedResultData, workflowInfo } = useStore(useShallow(selector));

  const nodeTemplateData = useStore((state) => state.nodeTemplateData);

  // 从 URL 解析 workflowId
  const [workflowId, setWorkflowId] = React.useState<string>("");

  // 设置工作流信息键值对
  const setWorkflowInfoByKey = useStore((state) => state.setWorkflowInfoByKey);

  // 工作流名称
  const workflowName = useStore((state) => state.workflowInfo?.workflow_name);

  const { setIsDataLoading } = useContext(EditorContexts);

  const updateToken = useStore((s) => s.updateToken);

  const CASCADE_X_OFFSET = 50; // 每次水平偏移
  const CASCADE_Y_OFFSET = 50; // 每次垂直偏移

  // 上一个节点位置记录
  const lastNodePositionRef = useRef<XYPosition>(null);

  const draggingNodeRef = useRef(false); // 正在拖动的节点

  /**
   * 添加节点元素
   * @param nodeTemplateType 节点模版类型
   * @param nodeData 节点数据
   * @default NodeTemplateType.TEXT_INPUT
   * @description 添加节点元素到 ReactFlow 中
   */
  const handleAddNode = (nodeTemplateType: NodeTemplateType = NodeTemplateType.TEXT_INPUT, nodeData?: NodeTemplateDetail) => {
    const nodeId = uuid(),
      ts = new Date().getTime();
    const { nodeWidth, nodeHeight } = getNodeDimension(nodeTemplateType);

    let position: XYPosition;
    if (!lastNodePositionRef.current) {
      const ViewPortCenter = getViewportCenter();
      position = {
        x: ViewPortCenter.x + nodeWidth / 2,
        y: ViewPortCenter.y,
      };
    } else {
      const { leftTop, rightBottom } = getViewportCorners();

      const previousPosition = lastNodePositionRef.current!;
      if (isNodeOutOfViewport(previousPosition, { leftTop, rightBottom }, { nodeWidth, nodeHeight })) {
        // 节点超出视口边界时，将节点位置重置为视口中心
        const ViewPortCenter = getViewportCenter();
        position = {
          x: ViewPortCenter.x + nodeWidth / 2,
          y: ViewPortCenter.y,
        };
      } else {
        // 节点右下偏移
        position = {
          x: previousPosition.x + CASCADE_X_OFFSET,
          y: previousPosition.y + CASCADE_Y_OFFSET,
        };
      }
    }

    const nodeServerId = `${nodeTemplateType}-${ts}-${nodeId}`;
    const newNode = {
      id: nodeServerId,
      type: nodeTemplateType,
      position: position,
      data: {},
    };

    // 同步锚定节点位置信息
    lastNodePositionRef.current = position;

    record(() => {
      addNode(newNode);
    });
  };

  /**
   * 获取当前视口的边界
   * @returns {{ leftTop: { x: number, y: number }, rightTop: { x: number, y: number }, leftBottom: { x: number, y: number }, rightBottom: { x: number, y: number } }} 当前视口的边界
   */
  const getViewportCorners = useCallback(() => {
    const el = reactflowContainerRef.current;
    if (!el) {
      return {
        leftTop: { x: 0, y: 0 },
        rightTop: { x: 0, y: 0 },
        leftBottom: { x: 0, y: 0 },
        rightBottom: { x: 0, y: 0 },
      };
    }

    const { x, y, zoom } = getViewport();
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // screenToFlow: flow = (screen - translate) / zoom
    const leftTop = {
      x: (0 - x) / zoom,
      y: (0 - y) / zoom,
    };

    const rightTop = {
      x: (w - x) / zoom,
      y: (0 - y) / zoom,
    };

    const leftBottom = {
      x: (0 - x) / zoom,
      y: (h - y) / zoom,
    };

    const rightBottom = {
      x: (w - x) / zoom,
      y: (h - y) / zoom,
    };

    return { leftTop, rightTop, leftBottom, rightBottom };
  }, [getViewport, reactflowContainerRef]);

  /**
   * 获取节点维度
   * @param nodeTemplateType 节点模版类型
   * @returns {NodeDimension} 节点维度
   */
  const getNodeDimension = (nodeTemplateType: NodeTemplateType) => {
    // 粗略估计当前节点类型对应的宽高
    if ([NodeTemplateType.TEXT_INPUT, NodeTemplateType.IMAGE_INPUT, NodeTemplateType.VIDEO_INPUT, NodeTemplateType.AUDIO_INPUT].includes(nodeTemplateType)) {
      return { nodeWidth: 300, nodeHeight: 250 };
    } else if ([NodeTemplateType.VIDEO_EDITOR].includes(nodeTemplateType)) {
      return { nodeWidth: 1300, nodeHeight: 800 };
    } else {
      // 逻辑节点
      return { nodeWidth: 300, nodeHeight: 1000 };
    }
  };

  /**
   * 检查节点是否超出视图范围
   * @param nodePos 节点位置
   * @param viewportCorners 当前视口的边界
   * @returns 是否超出视图范围
   */
  const isNodeOutOfViewport = (
    nodePos: { x: number; y: number },
    viewportCorners: {
      leftTop: { x: number; y: number };
      rightBottom: { x: number; y: number };
    },
    nodeDimension: { nodeWidth: number; nodeHeight: number }
  ) => {
    const NODE_WIDTH = nodeDimension.nodeWidth;
    const NODE_HEIGHT = nodeDimension.nodeHeight;

    const nodeLeft = nodePos.x;
    const nodeTop = nodePos.y;
    const nodeRight = nodePos.x + NODE_WIDTH;
    const nodeBottom = nodePos.y + NODE_HEIGHT;

    const viewLeft = viewportCorners.leftTop.x;
    const viewTop = viewportCorners.leftTop.y;
    const viewRight = viewportCorners.rightBottom.x;
    const viewBottom = viewportCorners.rightBottom.y;

    return nodeLeft < viewLeft || nodeTop < viewTop || nodeRight > viewRight || nodeBottom > viewBottom;
  };

  /**
   * 获取视图中心位置
   * @description 计算 ReactFlow 容器的视图中心位置
   * @returns {Position} 视图中心位置
   */
  const getViewportCenter = useCallback(() => {
    const el = reactflowContainerRef.current;
    if (!el) return { x: 0, y: 0 };

    const { x, y, zoom } = getViewport();
    const rect = el.getBoundingClientRect();

    return {
      x: (rect.width / 2 - x) / zoom,
      y: (rect.height / 2 - y) / zoom,
    };
  }, [getViewport, reactflowContainerRef]);

  /**
   * 统一删除事件
   * 原则：
   * 1. 节点删除时，无需手动删除关联的边，reactflow 会自动帮你处理（这是 reactflow 的默认行为）
   * 2. 边删除时，不影响关联的节点
   * @description 处理 ReactFlow 中的节点和边的删除操作
   * @param {OnDeleteParams<AppNode, AppEdge>} params - 包含要删除的节点和边的参数
   * @returns {boolean} - 返回 false 以阻止默认删除行为
   * */
  const handleOnDelete: OnDelete<AppNode, AppEdge> = useCallback(
    (params) => {
      const { nodes: nodesToDelete, edges: edgesToDelete } = params;

      if (nodesToDelete && nodesToDelete.length === 0 && edgesToDelete && edgesToDelete.length > 0) {
        // 仅删除边
        const edgeIdsToDelete = new Set(edgesToDelete.map((e) => e.id));
        record(() => {
          setEdges(edges.filter((edge) => !edgeIdsToDelete.has(edge.id)));
        });
      } else if (nodesToDelete && nodesToDelete.length > 0) {
        const nodeIdsToDelete = new Set(nodesToDelete.map((n) => n.id));
        const edgeIdsToDelete = new Set(edgesToDelete.map((e) => e.id));
        record(() => {
          setNodes(nodes.filter((node) => !nodeIdsToDelete.has(node.id)));
        });

        setEdges(edges.filter((edge) => !edgeIdsToDelete.has(edge.id)));
      }

      // 阻止默认删除行为，避免触发其他事件
      return false;
    },
    [record, setNodes, setEdges, nodes, edges]
  );

  /**
   * 节点变更处理
   * @description 处理 ReactFlow 中的节点变更操作
   * @param {NodeChange[]} changes - 节点变更数组
   * @returns {void}
   */
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 批量处理变更，减少重新渲染次数
      const positionChanges: NodeChange[] = [];
      const otherChanges: NodeChange[] = [];
      let shouldRecord = false;

      changes.forEach((change) => {
        if (change.type === "position") {
          positionChanges.push(change);
          if (!change.dragging) {
            // 拖拽结束时才记录历史
            shouldRecord = true;
            isNodeDraggingFirstSlice = true;
          } else if (isNodeDraggingFirstSlice) {
            // 拖拽开始时记录一次历史
            shouldRecord = true;
            isNodeDraggingFirstSlice = false;
          }
        } else if (change.type === "remove") {
          // 删除类型已经移交给 handleOnDelete 处理
          return;
        } else if (change.type === "select") {
          // 选择变更直接应用，不需要记录历史
          otherChanges.push(change);
        } else {
          // 其他类型的变更
          otherChanges.push(change);
        }
      });

      // 批量应用位置变更
      if (positionChanges.length > 0) {
        if (shouldRecord && positionChanges.some((c) => c.type === "position" && !c.dragging)) {
          // 拖拽结束时记录历史
          record(() => {
            onNodesChange(positionChanges);
          });
        } else {
          // 拖拽过程中直接更新，不记录历史
          onNodesChange(positionChanges);
        }
      }

      if (otherChanges.length > 0) {
        onNodesChange(otherChanges);
      }
    },
    [record, onNodesChange]
  );

  // 处理边变更事件
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // 过滤掉删除操作（由 handleOnDelete 处理）
      const validChanges = changes.filter((change) => change.type !== "remove");

      // 批量应用变更
      if (validChanges.length > 0) {
        onEdgesChange(validChanges);
      }
    },
    [onEdgesChange]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      record(() => {
        onConnect(connection);
      });
    },
    [record, onConnect, nodes]
  );

  // 处理节点鼠标进入事件
  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: AppNode) => {
    const handlers = (window as any).nodeToolbarHandlers;
    if (handlers && handlers.onNodeMouseEnter) {
      handlers.onNodeMouseEnter(node.id);
    }
  }, []);

  // 处理节点鼠标离开事件
  const handleNodeMouseLeave = useCallback(() => {
    const handlers = (window as any).nodeToolbarHandlers;
    if (handlers && handlers.onNodeMouseLeave) {
      handlers.onNodeMouseLeave();
    }
  }, []);

  // 处理节点拖拽开始事件
  const handleNodeDragStart = useCallback((_: React.MouseEvent, node: AppNode) => {
    const handlers = (window as any).nodeToolbarHandlers;
    if (handlers && handlers.onNodeDragStart) {
      draggingNodeRef.current = true;
      handlers.onNodeDragStart(node.id);
    }
  }, []);

  // 处理节点拖拽结束事件
  const handleNodeDragStop = useCallback((_: React.MouseEvent, node: AppNode) => {
    const handlers = (window as any).nodeToolbarHandlers;
    if (handlers && handlers.onNodeDragStop) {
      draggingNodeRef.current = false;
      handlers.onNodeDragStop(node.id);
    }
  }, []);

  /**
   * 处理画布拖拽/缩放结束事件
   * @description 当用户完成画布的拖拽或缩放操作时触发，用于重置节点的级联位置
   * @returns {void}
   */
  const handleMoveEnd = useCallback(() => {
    if (draggingNodeRef.current) return;

    // 重置最后一个节点的位置信息
    lastNodePositionRef.current = null;
  }, []);

  /**
   * 处理选择变更事件
   * @description 当用户选择或取消选择节点时触发，更新节点的 z-index 以实现选中置顶效果
   * @param {OnSelectionChangeParams} params - 选择变更参数，包含选中的节点数组
   * @returns {void}
   */
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selectedNodes = params.nodes;
      const nextNodes = nodes.map((node) => {
        const isSelected = selectedNodes.some((n) => n.id === node.id);
        const nextZ = isSelected ? 999 : 1;
        const prevZ = (node.style as any)?.zIndex ?? 1;
        if (prevZ === nextZ) return node;
        return {
          ...node,
          style: {
            ...node.style,
            zIndex: nextZ,
          },
        };
      });

      const changed = nextNodes.some((n, i) => n !== nodes[i]);
      if (!changed) return;

      setNodes(nextNodes);
    },
    [setNodes]
  );

  /**
   * 从 URL 解析 workflowId
   * @description 从当前 URL 中解析出 workflowId 参数，并更新状态
   * @returns {void}
   */
  useEffect(() => {
    const path = window.location.pathname || "";
    const match = path.match(/^\/editor\/([^\/?#]+)/);
    if (match && match[1]) {
      const workflowId = decodeURIComponent(match[1]);

      setWorkflowId(workflowId);

      //初始化工作流详情
      const run = async () => {
        try {
          // 1、初始化模版数据
          await initNodeTemplateData();

          // 2、初始化当前 workflow 的信息
          const updateToken = await initWorkflowDetail(workflowId);

          // 3、初始化WS
          const ws = new AutoSaveWebSocket({
            url: WS_URL,
            workflowId,
            updateToken,
            reconnectInterval: 3000, // 自动重连间隔
            maxRetries: 10, // 最大重试次数
          });
          wsRef.current = ws;
        } catch (error) {
          //需要给出弹窗，提示用户失败
          window.location.href = "/workspace";
        } finally {
          setIsDataLoading(false);
        }
      };

      run();
    }
  }, []);


  // 触发自动保存
  const triggerAutoSave = useCallback(() => {
    // 避免重复触发
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      performSaveRef.current?.();
    }, AUTO_SAVE_DELAY);
  }, []);

  /**
   * 执行保存操作
   * @description 前端任意数据变更，三秒内如果没有其他操作，自动触发保存
   * @returns {Promise<void>}
   */
  const performSave = useCallback(async () => {
    if (isSavingRef.current) return;

    try {
      isSavingRef.current = true;

      // 优先使用 Web Worker 保存，如果不支持就降级到 WebSocket
      if (workerAvailable && workerRef.current) {
        // 这部分实现优先级降级，后续处理
        // workerRef.current.postMessage({
        //   id: workflowId,
        //   workflow_name: "workflow_snapshot",
        //   content: { nodes, edges, nodeRuntimeData },
        // });
        // 变更AutoSaveTime
      } else {
        const snapshotData = { nodes, edges, nodeRuntimeData, nodeSelectedResultData };
        try {
          wsRef.current?.send(
            JSON.stringify({
              code: "20001",
              data: {
                id: workflowId,
                workflow_version: useStore.getState().workflowInfo.workflow_version,
                workflow_name: useStore.getState().workflowInfo.workflow_name,
                content: snapshotData,
              },
              update_token: updateToken
            })
          );

          // 变更AutoSaveTime
          setWorkflowInfoByKey("update_time", new Date().toISOString());
        } catch (error) {
          console.error("保存工作流快照失败:", error);
        }
      }
    } catch (error) {
      console.error("保存工作流快照失败:", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [workflowId, nodes, edges, nodeRuntimeData, nodeSelectedResultData]);

  // 基于 html2canvas 捕获当前工作流为base64图片
  const captureFlow = async () => {
    if (!reactflowContainerRef.current) return;

    try {
      const flowElement = reactflowContainerRef.current.querySelector(".react-flow") as HTMLElement;
      if (!flowElement) return;

      const canvas = await html2canvas(flowElement, {
        scale: 1,
        backgroundColor: "#ffffff",
        imageTimeout: 500,
        useCORS: true,
        foreignObjectRendering: false,
        logging: false,
        onclone: (clonedDoc, element) => {
          // 移除交互元素（如面板、控制条、最小地图）
          const interactiveElements = clonedDoc.querySelectorAll(".react-flow__panel, .react-flow__controls, .react-flow__minimap");
          interactiveElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.display = "none";
            }
          });
        },
      });

      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("截图失败:", error);
      return null;
    }
  };

  /**
   * 捕获当前工作流为base64图片
   */
  const captureWorkflowBase64Image = useCallback(
    async (workflowId: string, updateToken: string) => {
      if (isCaptureSavingRef.current) return;

      try {
        isCaptureSavingRef.current = true;

        // 截图当前网页视口为base64 图标并通过接口提交给后端
        const base64 = await captureFlow();
        if (!base64) return;

        const res = await editorApi.postWorkflowScreenUpload(`/api/workflow/base/screen/upload_base64?workflow_id=${workflowId}&update_token=${updateToken}`, { id: workflowId, content_base64: base64 });
        if (res.success && res.result?.code === 0) {
          // console.log("保存快照截图成功.");
        } else {
          if (res.result?.msg) {
            console.error(res.result.msg);
          }
        }
      } catch (error) {
        console.error("保存快照截图失败:", error);
      } finally {
        isCaptureSavingRef.current = false;
      }
    },
    [workflowId]
  );

  // Update ref
  performSaveRef.current = performSave;

  /**
   * 初始化历史记录
   * @description 在组件挂载时初始化历史记录，确保撤销/重做功能正常工作
   * @returns {void}
   */
  useEffect(() => {
    initializeHistory();
  }, [initializeHistory]);

  useEffect(() => {
    if (!workflowId) return;

    // 工作流信息保存
    triggerAutoSave();
  }, [workflowId, nodes, edges, nodeRuntimeData, nodeSelectedResultData, workflowName]);

  // useEffect(() => {
  //   if (!workflowId || !updateToken) return;

  //   // 画布截图 轮训
  //   const interval = 1000 * 6; // 30秒轮训一次

  //   // 首次执行
  //   captureWorkflowBase64Image(workflowId, updateToken);

  //   autoCaptureTimerRef.current = setInterval(() => {
  //     captureWorkflowBase64Image(workflowId, updateToken);
  //   }, interval);

  //   return () => {
  //     if (autoCaptureTimerRef.current) {
  //       clearInterval(autoCaptureTimerRef.current);
  //     }
  //   };
  // }, [workflowId, updateToken, captureWorkflowBase64Image]);

  useEffect(() => {
    return () => {
      // 清理自动保存定时器
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={"w-full min-h-screen flex flex-col relative"}>
      {/* 右上角用户面板 */}
      <div className="fixed top-0 right-3 py-3 z-20">
        <UserCenter setIsDataLoading={setIsDataLoading} />
      </div>

      {/* 左上角Home面板 */}
      <div className="fixed left-3 top-0 py-3 z-20">
        <PannelHomeComponent />
      </div>

      {/* 左侧组件面板 */}
      <PannelLeftComponent onAddNode={handleAddNode} nodeTemplateData={nodeTemplateData || []} />

      {/* 中间主面板 */}
      <div ref={reactflowContainerRef} className="flex-1 relative" tabIndex={0}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onDelete={handleOnDelete}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onMoveEnd={handleMoveEnd}
          onSelectionChange={handleSelectionChange}
          isValidConnection={isValidConnection}
          fitView={true}
          nodesDraggable={true}
          selectNodesOnDrag={true} // 启用后，拖动节点时会选中所有与拖动节点相关的节点
          selectionMode={SelectionMode.Full} // Full 全覆盖框选; Partial 碰撞框选
          multiSelectionKeyCode={["Control", "Meta"]} // 按住此键即可同时选择多个节点和边
          selectionKeyCode={["Shift", "Meta"]} // 按住此键即可点击并拖动鼠标，在多个节点和边周围绘制选择框
          deleteKeyCode={[]} // 按住此键即可删除选中的节点和边
          autoPanOnNodeFocus={true}
          panOnDrag={[1]} // 通过点击并拖动来平移视口 或 限制哪些鼠标按钮可以激活平移功能
          panOnScroll={true} // 启用后，滚动鼠标滚轮时会平移视口
          zoomOnScroll={false} // 启用后，滚动鼠标滚轮时会缩放视口
          zoomOnPinch={true} // 启用后，通过双指缩放会缩放视口
          zoomOnDoubleClick={true}
          selectionOnDrag={true} // 启用后，拖动节点时会选中所有与拖动节点相关的节点
          proOptions={{ hideAttribution: true }}
          // 性能优化属性 - 减少 ResizeObserver 的使用
          nodeOrigin={[0.5, 0]} // 设置节点的垂直原点为顶部，即水平居中、垂直顶部对齐
          snapToGrid={false} // 启用后，拖动节点时节点将自动吸附到网格上
          snapGrid={[15, 15]} // 配置节点将捕捉到的网格
          connectionLineType={ConnectionLineType.Bezier}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }} // 设置视口的初始位置和缩放级别
          minZoom={0.5}
          maxZoom={3}
          // 添加这些属性来优化 ResizeObserver 的使用
          elevateNodesOnSelect={false} // 禁用选中时的节点提升，减少重新渲染
          disableKeyboardA11y={true} // 禁用键盘辅助功能，减少事件监听
          onlyRenderVisibleElements={false} // 指示 React Flow 仅渲染视口中可见的节点和边。当节点和边的数量很多时，这可能会提高性能，但也会增加开销
          style={{
            background: "#F3F3F3",
            transformOrigin: "0px 0px",
            backfaceVisibility: "hidden",
            WebkitFontSmoothing: "antialiased",

            // 添加这些样式来稳定布局
            contain: "layout style paint", // CSS containment 优化
          }}
        >
          <MiniMap
            zoomable
            pannable
            nodeClassName={nodeClassName}
            className="!m-0"
            position="bottom-right"
            // 优化 MiniMap 以减少 ResizeObserver 使用
            style={{
              contain: "layout style paint",
              bottom: "56px",
              right: "12px",
              borderRadius: "5px",
            }}
            nodeColor={(node) => getOutputHandleColorByTemplateType(node.type)}
          />
          <ZoomSlider />
        </ReactFlow>
      </div>
    </div>
  );
};

export default () => {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
};
