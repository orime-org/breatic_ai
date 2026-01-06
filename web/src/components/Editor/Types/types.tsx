import type { Node, Edge, OnConnect, OnNodesChange, OnEdgesChange } from "@xyflow/react";
import { NodeTemplateType } from "../Dict/dict";
import type { Result } from "../../../api/breaticFetch";
// 引入定义边、节点组件
import EdgeRedCloseButton from "../Components/Edge/EdgeRedCloseButton";
// input组件
import NodeTextInput from "../Components/InputNode/NodeTextInput";
import NodeImageInput from "../Components/InputNode/NodeImageInput";
import NodeVideoInput from "../Components/InputNode/NodeVideoInput";
import NodeAudioInput from "../Components/InputNode/NodeAudioInput";
// block组件
import NodeTextSplit from "../Components/LogicNode/NodeTextSplit";
import NodeTextToImage from "../Components/LogicNode/NodeTextToImage";
import NodeImageToImage from "../Components/LogicNode/NodeImageToImage";
import NodeTextToVideo from "../Components/LogicNode/NodeTextToVideo";
import NodeImageToVideo from "../Components/LogicNode/NodeImageToVideo";
import NodeAddSoundToVideo from "../Components/LogicNode/NodeAddSoundToVideo";
import NodeVideoLipSync from "../Components/LogicNode/NodeVideoLipSync";
import NodeTextToSpeech from "../Components/LogicNode/NodeTextToSpeech";
import NodeGenerateMusics from "../Components/LogicNode/NodeGenerateMusics";
import NodeGenerateMelody from "../Components/LogicNode/NodeGenerateMelody";
import NodeVideoEditor from "../Components/SceneEditor/VideoEditor/NodeVideoEditor";
import { resultBase } from "./resultData";
import { runtimeParameter, selectedResultInfo } from "./runtimeData";

export const nodeTypes = {
  [NodeTemplateType.TEXT_INPUT]: NodeTextInput,
  [NodeTemplateType.IMAGE_INPUT]: NodeImageInput,
  [NodeTemplateType.VIDEO_INPUT]: NodeVideoInput,
  [NodeTemplateType.AUDIO_INPUT]: NodeAudioInput,
  [NodeTemplateType.ADD_SOUND_TO_VIDEO]: NodeAddSoundToVideo,
  [NodeTemplateType.TEXT_SPLITER]: NodeTextSplit,
  [NodeTemplateType.TEXT_TO_IMAGE]: NodeTextToImage,
  [NodeTemplateType.IMAGE_TO_IMAGE]: NodeImageToImage,
  [NodeTemplateType.TEXT_TO_VIDEO]: NodeTextToVideo,
  [NodeTemplateType.IMAGE_TO_VIDEO]: NodeImageToVideo,
  [NodeTemplateType.VIDEO_LIP_SYNC]: NodeVideoLipSync,
  [NodeTemplateType.TEXT_TO_SPEECH]: NodeTextToSpeech,
  [NodeTemplateType.GENERATE_MUSICS]: NodeGenerateMusics,
  [NodeTemplateType.GENERATE_MELODY]: NodeGenerateMelody,
  [NodeTemplateType.VIDEO_EDITOR]: NodeVideoEditor,
};

/**
 * 静态枚举数据
 * 用于节点的枚举类型，如 aspect_ratio["1:1", "16:9", "9:16"]等
 */
export type NodeStaticEnumsItem = {
  enums_name: string;
  enums_code: string;
};
export type NodeStaticEnumsGroup = {
  enums_type: string;
  items: NodeStaticEnumsItem[];
};
export type NodeStaticEnumsData = NodeStaticEnumsGroup[];

/**
 * 工作流 - 节点LLMS大模型数据
 * 用于节点的LLMS大模型类型，如 gpt-3.5-turbo, gpt-4等
 */
export type NodeWorkflowLlmsItem = {
  name: string;
  cost: number;
  id: string;
};
export type NodeWorkflowLlmsGroup = {
  text: string;
  code: number;
  llms: NodeWorkflowLlmsItem[];
};
export type NodeWorkflowLlmsData = NodeWorkflowLlmsGroup[];

export enum NODE_EXECUTE_STATUS_CODE {
  SUCCESS = 0,
  ERROR = 500,
}

export type NodeExectionSSEDataResultItemResult = {
  id: string;
  data: string;
};

/**
 * 单节点SSE请求的相应数据结构 【详见： 工作流节点执行接口】
 * 每个节点执行SSE的历史数据数组 NodeExectionSSEDataGroup[] 中，
 * 每个 NodeExectionSSEDataGroup 数据项包含以下字段：
 * node_exec_id: number; // 节点执行ID
 * node_content: NodeExectionSSEDataContentItem;
 * exec_time:number;
 * exec_result: NodeExectionSSEDataResultItem;
 * */
export type NodeExectionSSEDataContentItem = {
  id?: string; // 节点ID
  flow_id?: string; // 工作流ID
  template_code: number; // 节点模板字节码
  ratio?: string;
  model_id?: string;
  model_index?: number;
  source_text?: string[];
  extra_info?: {
    model_name?: string; // 模型名称
    model_icon_name?: string; // 模型图标名称
  };
};
export type NodeExectionSSEDataResultItem = {
  index: number;
  status?: string; //  执行状态
  status_code?: number; // 执行状态
  result?: string | NodeExectionSSEDataResultItemResult[];
  credits?: number;
  source_text: string;
  source_image?: string;
  source_video?: string;
  source_audio?: string;
  exec_time: number;
  create_time?: number;
  id?: string; // 节点执行ID
  msg?: string; // 节点执行消息
};
export type NodeExectionSSEDataGroup = {
  node_exec_id: string; // 节点执行ID
  node_content: NodeExectionSSEDataContentItem;
  exec_time: number;
  exec_result: NodeExectionSSEDataResultItem;
};
type NodeExectionSSEDataD = { [key: string]: NodeExectionSSEDataGroup[] };
export type NodeExectionSSEData = {
  data: NodeExectionSSEDataD; // 节点执行SSE的历史数据
  page: number; // 当前页码
  totalPage: number; // 总页数
  isStreaming: boolean; // 是否正在流式传输
};

/**
 * 节点执行状态
 * 1. READY 就绪
 * 2. RUNNING 运行
 * 3. WAIT 阻塞
 */
export enum NODE_EXECUTE_STATUS {
  READY = "READY",
  RUNNING = "RUNNING",
  WAIT = "WAIT",
}

//#region 节点默认数据
export type NodeTemplateDetail = {
  template_name: string;
  template_code: number; // 节点模板字节码 见：dict.tsx -> NodeTemplateType
  template_icon: string; // 节点图标名称
  membership_level: number;
  remark: string;
  content: any; // 节点默认数据内容
};
export type NodeTemplateData = NodeTemplateDetail[];
export type NodeCompleteTemplateData = {
  version: string;
  data: NodeTemplateDetail[];
};
//#endregion

export type AppNode = Node;
export type AppEdge = Edge;
export interface AppState {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange<AppEdge>;
  onConnect: OnConnect;
  addNode: (node: AppNode, options?: { select?: boolean }) => void;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  record: (callback: () => void) => void;
  initializeHistory: () => void;

  componentNodeStringStore?: Record<string, string>; // 节点的字符串数据
  setComponentNodeStringStore?: (nodeId: string, value: string) => void;

  componentNodeNumberStore?: Record<string, number>; // 节点的数字数据
  setComponentNodeNumberStore?: (nodeId: string, value: number) => void;

  /**
   * 执行状态
   * 规则：
   *  RUNNING 时，只有SSE-DONE 才会切换状态
   *  input节点 && 逻辑节点的必选条件 都满足时，才会切换状态
   */
  componentNodeExecuteState?: Record<string, NODE_EXECUTE_STATUS>; // 节点执行状态
  setComponentNodeExecuteState?: (nodeId: string, value: NODE_EXECUTE_STATUS) => void;

  componentNodeExectionSSEData?: Record<string, NodeExectionSSEData>; // 节点执行SSE数据
  setComponentNodeExectionSSEData?: (nodeId: string, value: NodeExectionSSEData) => void;
  setComponentNodeExectionSSEDataPage?: (nodeId_controlTag: string, value: number) => void; // 设置分页

  // Text To Image ResultData
  componentNodeTextToImageResultData?: Record<string, Result>; // 节点Text To Image结果数据
  setComponentNodeTextToImageResultData?: (nodeId: string, value: Result) => void;

  nodeTemplateData: NodeTemplateData; // 节点默认模板数据

  nodeResultData: Record<string, any>; // 节点结果数据
  setNodeResultData: (nodeId: string, value: resultBase) => void; // 设置节点结果数据

  nodeRuntimeData: Record<string, any>; // 节点运行时数据
  setNodeRuntimeData: (nodeId: string, value: runtimeParameter) => void; // 设置节点运行时数据
  setNodeRuntimeDataByKey: (nodeId: string, key: string, value: any) => void; // 设置节点运行时数据键值对
  setEditorSnapshotRuntimeData: (nodeId: string, key: string, value: any) => void; // 设置编辑器快照运行时数据

  nodeSelectedResultData: Record<string, selectedResultInfo>; // 节点选中结果数据
  setNodeSelectedResultData: (nodeId: string, value: selectedResultInfo) => void; // 设置节点选中结果数据

  workflowInfo: WorkflowInfo; // 工作流信息
  setWorkflowInfo: (value: WorkflowInfo) => void; // 设置工作流信息
  setWorkflowInfoByKey: <K extends keyof WorkflowInfo>(key: K, value: WorkflowInfo[K]) => void; // 设置工作流信息键值对

  updateToken: string; // 工作流Token
}

export interface NodeHandle {
  type: "target" | "source";
  // position: Position;
}

// 自定义边类型
export const edgeTypes = {
  edgeRedCloseButton: EdgeRedCloseButton,
};

// 节点包装器数据
export interface WrapperBlocksData extends NodeTemplateDetail {
  // 占位，后续根据节点类型，填充不同的数据
}

export interface MockDataContent {
  req: string;
  res: string | string[];
}

// 节点结果内容渲染位置
export enum NodeResultRenderPosition {
  INNER = "INNER",
  OVERLAY = "OVERLAY",
}

// 节点逻辑区组件标签
export enum CONTROL_TAG {
  TEXT_MODEL = "models", // 文本模型选择
  IMAGE_MODEL = "models", // 图形模型选择
  ASPECT_RATIO = "aspect_ratio", // 宽高比, 16:9, 9:16, 1:1
  LLMS = "llms", // 大模型选择
  INSTRUCTION = "instruction", // 文本指令
  UPSCALE_FACTOR = "upscale_factor", // 视频 upscale 因子, 2x/4x/6x
  TIPS = "tips", // 提示信息
  VIDEO_FILL_MODEL = "fill_model", // 视频填充模型 ping-pong/ cut-off / loop
  AUDIO_MODEL = "models", // 音频模型选择
  VIDEO_MODEL = "models", // 视频模型选择
  DURATION = "duration", // 视频时长
  VOICE = "voice", // 语言选择
  VOICE_TYPE = "voice_type", // 语音类型选择
}

// 节点默认数据
export interface DefaultNodeData {
  content: any;
  membership_level: number;
  remark: string;
  template_code: number;
  template_name: string;
}

// 工作流快照数据类型
export type WorkflowSnapshot = {
  nodes: AppNode[];
  edges: AppEdge[];
  nodeRuntimeData: Record<string, any>;
};

// 工作流信息
export interface WorkflowInfo {
  id: string; // 工作流ID
  workflow_version: string; // 工作流版本, 对齐 nodeTemplateData 接口信息变更
  workflow_name: string; // 工作流名称
  workflow_icon?: string; // 工作流图标, 保留字段
  workflow_screen_pic?: string; // 工作流快照截图
  remark?: string; // 工作流备注
  update_time?: string; // 工作流更新时间
  create_time?: string; // 工作流创建时间
}

// 节点执行结果数据
export interface NodeExecResults {
  total: number;
  records: Record<string, any>[];
}

// 节点上传URL类型
export type WorkflowNodeUploadUrlType = {
  url: string;
  file_type: string;
};

// 节点结果详情保存类型
export type WorkflowNodeResultsDetailSaveType = {
  id: string;
  result_id: string;
  data: string;
};

export type WorkflowCreateType = {
  workflow_name: string;
};

export interface WorkflowNodeExecType {
  id: string;
  node_id: string;
  exec_result: any;
  create_time: string;
  template_node_code: number;
  node_content: any;
  workflow_id: string;
  user_id: string;
  exec_time: number;
  update_time: string;
}
export interface WorkflowNodeExecuteResult {
  WorkflowNodeExec: WorkflowNodeExecType;
}
