import { NodeExectionSSEDataResultItemResult } from "./types";

/**
 * 所有input节点的数据和逻辑节点的结果数据的基类
 * */
export interface resultBase {}

// NodeTextToImage 执行结果数据
export interface NodeTextToImageResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;
  source_text: string;
  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}

// NodeImageToImage 执行结果数据
export interface NodeImageToImageResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;
  source_text: string;
  source_image: string;
  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}

// NodeStyleImageGen 执行结果数据
export interface NodeStyleImageGenResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;
  source_text: string;
  source_image: string;
  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  models: string;
}

// NodeTextToVideo 执行结果数据
export interface NodeTextToVideoResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;

  source_text: string;
  source_video: string;
  
  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}

// NodeImageToVideo 执行结果数据
export interface NodeImageToVideoResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;

  source_text: string;
  source_image: string;

  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}

// NodeAddSoundToVideo 执行结果数据
export interface NodeAddSoundToVideoResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;

  source_text: string;
  source_video: string;

  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}

/**
 * 批量视频唇形同步（Batch Video Lip Sync to Videos）节点执行结果数据
 */
export interface NodeVideoLipSyncResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;

  source_audio: string;
  source_video: string;

  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}

// NodeTextToSpeech 执行结果数据
export interface NodeTextToSpeechResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;

  source_text: string;

  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}

export interface NodeGenerateMusicsResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;

  source_text: string;

  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}

/**
 * 旋律生成（Melody Generator）节点执行结果数据
 */
export interface NodeGenerateMelodyResultData extends resultBase {
  index: number;
  id: string;
  result: string;
  status_code?: number;

  source_text: string;

  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}

/**
 * 文本分割（Text Split）节点执行结果数据
 */
export interface NodeTextSplitResultData extends resultBase {
  index: number;
  id: string;
  result: NodeExectionSSEDataResultItemResult[];
  status_code?: number;

  source_text: string;

  credits: number;
  exec_time: number;
  create_time: number;
  node_exec_id: string;
  model_id: string;
  model_name: string;
  model_icon_name: string;
}
