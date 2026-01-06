/**
 * Editor 状态管理
 * 1. 节点状态管理
 * 2. 边状态管理
 * 3. 历史记录管理
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { temporal } from "zundo";
import type { AppNode, AppState, NODE_EXECUTE_STATUS, NodeExectionSSEData, WorkflowInfo } from "../Types/types";
import type { resultBase } from "../Types/resultData";
import { setAutoFreeze } from "immer";
import { selectedResultInfo } from "../Types/runtimeData";

setAutoFreeze(false);

const useStore = create<AppState>()(
  immer(
    temporal(
      (set, get) => ({
        nodes: [],
        edges: [],
        onNodesChange: (changes) => {
          set({
            nodes: applyNodeChanges(changes, get().nodes),
          });
        },
        onEdgesChange: (changes) => {
          set({
            edges: applyEdgeChanges(changes, get().edges),
          });
        },
        onConnect: (connection) => {
          set({
            edges: addEdge(
              {
                ...connection,
                type: "edgeRedCloseButton", // 设置默认边类型为 EdgeRedCloseButton
              },
              get().edges
            ),
          });
        },
        addNode: (node: AppNode, options?: { select?: boolean }) =>
          set((state) => ({
            nodes: [
              // 先清空旧选中
              ...state.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
              // 再插入新节点
              {
                ...node,
                selected: options?.select ?? true,
              },
            ],
          })),
        setNodes: (nodes) => {
          set({ nodes });
        },
        setEdges: (edges) => {
          set({ edges });
        },
        record: (callback: () => void) => {
          const temporalStore = useStore.temporal.getState();
          temporalStore.resume();
          callback();
          temporalStore.pause();
        },
        initializeHistory: () => {
          // 初始化历史记录
          const temporalStore = useStore.temporal.getState();
          temporalStore.clear();
          temporalStore.pause();
        },
        componentNodeStringStore: {},
        setComponentNodeStringStore: (nodeId: string, value: string) => {
          set((state) => {
            if (!state.componentNodeStringStore) state.componentNodeStringStore = {};
            state.componentNodeStringStore[nodeId] = value ?? "";
          });
        },
        componentNodeNumberStore: {},
        setComponentNodeNumberStore: (nodeId: string, value: number) => {
          set((state) => {
            if (!state.componentNodeNumberStore) state.componentNodeNumberStore = {};
            state.componentNodeNumberStore[nodeId] = value;
          });
        },
        componentNodeExecuteState: {},
        setComponentNodeExecuteState: (nodeId: string, value: NODE_EXECUTE_STATUS) => {
          set((state) => {
            if (!state.componentNodeExecuteState) state.componentNodeExecuteState = {};
            state.componentNodeExecuteState[nodeId] = value;
          });
        },

        componentNodeExectionSSEData: {},
        setComponentNodeExectionSSEData: (nodeId: string, value: NodeExectionSSEData) => {
          set((state) => {
            if (!state.componentNodeExectionSSEData) state.componentNodeExectionSSEData = {};
            state.componentNodeExectionSSEData[nodeId] = value;
          });
        },
        setComponentNodeExectionSSEDataPage: (nodeId: string, value: number) => {
          set((state) => {
            if (!state.componentNodeExectionSSEData) state.componentNodeExectionSSEData = {};
            // 添加安全检查
            if (!state.componentNodeExectionSSEData[nodeId]) {
              state.componentNodeExectionSSEData[nodeId] = {
                data: {},
                page: 1,
                totalPage: 1,
                isStreaming: false,
              };
            }
            state.componentNodeExectionSSEData[nodeId].page = value;
          });
        },
        nodeTemplateData: [], // 节点默认模板数据

        nodeRuntimeData: {}, // 节点运行时数据
        setNodeRuntimeData: (nodeId: string, value: any) => {
          set((state) => {
            if (!state.nodeRuntimeData) state.nodeRuntimeData = {};
            state.nodeRuntimeData[nodeId] = value;
          });
        },
        setNodeRuntimeDataByKey: (nodeId: string, key: string, value: any) => {
          set((state) => {
            if (!state.nodeRuntimeData) state.nodeRuntimeData = {};
            if (!state.nodeRuntimeData[nodeId]) state.nodeRuntimeData[nodeId] = {};
            state.nodeRuntimeData[nodeId][key] = value;
          });
        },
        // 编辑器快照数据
        setEditorSnapshotRuntimeData: (nodeId: string, key: string, value: any) => {
          set((state) => {
            if (!state.nodeRuntimeData) state.nodeRuntimeData = {};
            if (!state.nodeRuntimeData[nodeId]) state.nodeRuntimeData[nodeId] = {};
            if (!state.nodeRuntimeData[nodeId]["snapshot"]) state.nodeRuntimeData[nodeId]["snapshot"] = {};

            state.nodeRuntimeData[nodeId]["snapshot"][key] = value;
          });
        },

        nodeSelectedResultData: {}, // 节点选中结果数据
        setNodeSelectedResultData: (nodeId: string, value: selectedResultInfo) => {
          set((state) => {
            if (!state.nodeSelectedResultData) state.nodeSelectedResultData = {};
            state.nodeSelectedResultData[nodeId] = value;
          });
        },

        nodeResultData: {}, // 节点结果数据
        setNodeResultData: (nodeId: string, value: resultBase) => {
          set((state) => {
            if (!state.nodeResultData) state.nodeResultData = {};
            state.nodeResultData[nodeId] = value;
          });
        },
        workflowInfo: {} as WorkflowInfo, // 工作流信息
        setWorkflowInfo: (value: WorkflowInfo) => {
          set((state) => {
            if (!state.workflowInfo) state.workflowInfo = {} as WorkflowInfo;
            state.workflowInfo = value;
          });
        },
        setWorkflowInfoByKey: <K extends keyof WorkflowInfo>(key: K, value: WorkflowInfo[K]) => {
          set((state) => {
            if (!state.workflowInfo) state.workflowInfo = {} as WorkflowInfo;
            state.workflowInfo[key] = value;
          });
        },
        updateToken: ""
      }),
      {
        partialize: (state) => ({
          nodes: state.nodes,
          edges: state.edges,
        }),
        limit: 10,
        onSave: () => {
          return true;
        },
      }
    )
  )
);

export default useStore;

export const useUndoRedo = () => {
  const temporalStore = useStore.temporal.getState();
  // 默认暂停跟踪
  if (temporalStore.isTracking) {
    temporalStore.pause();
  }

  return temporalStore;
};
