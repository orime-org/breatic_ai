import { useMemo } from "react";
import useStore from "../Store/store";
import { ProjectData } from "../Components/SceneEditor/VideoEditor/utils/projectData";
import { formatDisplayValue } from "../Utils/index";

/**
 * 用来返回特定输入桩的 counter 数量
 * @param key 当前输入桩的索引
 */
export interface HandleCounter {
  [key: number]: number;
}

// 用来控制输入、输出桩的类型及文本显示
export enum HandleType {
  TEXT = "Text",
  IMAGE = "Image",
  VIDEO = "Video",
  AUDIO = "Audio",
}

// 节点的结果类型
export enum SelectedResultsType {
  TEXT = "text",
  ID = "id",
  URL = "url",
  TEXT_LIST = "text_list",
}

/**
 * 节点选中结果数据
 * */
export interface selectedResultInfo {
  counter: number; // 给下游节点的有效数据数量

  /**
   * 节点的结果类型
   *  "text" - 节点的原始数据，对应的 selectedResults为字符串数组
   *  "id" - 结果数据所在的ResultData的Id，对应的selectedResults 为字符串对象
   *  "url" - 数据节点的URL数据，例如图片URL、视频URL、音频URL等，对应的selectedResults 为字符串数组
   *  "text_list" - 节点的原始数据列表，对应的selectedResults为字符串对象
   * */
  selectedResultsType: SelectedResultsType;

  /**
   * 选中的结果数据，下一个逻辑节点的运行时数据
   * 当selectedResultsType为 text 时, 存储选中的结果数据；
   * 当selectedResultsType为 id 时, 存储选中的结果数据的Index数组；
   * 当selectedResultsType为 url 时, 存储选中的结果URL数据；
   * 当selectedResultsType为 text_list 时, 存储选中的结果数据的Index数组；
   * 示例:
   *  1、当selectedResultsType为 text 时, selectedResults = ["hello", "world"]
   *  2、当selectedResultsType为 id 时, selectedResults = { "batch_0": [0], "batch_2": [1]}, 表示选中了第0个页的第0个结果数据, 和第2个页的第1个结果数据
   *  3、当存在逻辑节点的新结果选择，且选择了多个结果数据时，selectedResults = { "batch_-2": [0], "batch_-1": [1], "batch_0": [0, 1, 2]}, 其中 "batch_0": [0, 1, 2] 即为新选中的结果，所以该数据应该是逻辑节点结果的倒序选择索引集合
   * */
  selectedResults: {} | [];
}

/**
 * 获取运行时所有输入桩数据
 * 规则：
 *  1. 如果输入桩的selectedResultsId 为 "text"，则直接返回selectedResults
 *  2. 如果输入桩的selectedResultsId 为 "id"，则根据selectedResults 中存储的Index 从Store的nodeResultData 中获取数据
 *  3. 如果输入桩的selectedResultsId 为 "url"，则直接返回selectedResults
 *  4. 如果输入桩的selectedResultsId 为 "text_list"，则根据selectedResults 中存储的Index 从Store的nodeResultData -> result 中获取数据
 *  4. 如果输入桩的selectedResultsId 为空，则返回空数组
 *
 * 示例
 *   selectedResultsId = “id”
 *   selectedResults = {"batch_-3": [0], "batch_-1": [1]} // {逆序索引: [结果的正序索引]}
 *   currentNodeResultData = [
 *    [
 *      {"node_exec_id": "019a0a17d2117803845ef173371d3983", "node_content": {...}}
 *    ],
 *    [
 *      {"node_exec_id": "019a0a19b87d7cc39ad32d9717fb7ec7", "node_content": {...}}
 *    ],
 *    [
 *      {"node_exec_id": "019a0a1bb0437c9d8a587e8b9adc1457", "node_content": {...}},
 *      {"node_exec_id": "019a0a1bb0437c9d8a587e8b9adc1457", "node_content": {...}}
 *    ]
 *   ]
 *   filterSelectedResults = [
 *    {"node_exec_id": "019a0a17d2117803845ef173371d3983", "node_content": {...}},
 *    {"node_exec_id": "019a0a1bb0437c9d8a587e8b9adc1457", "node_content": {...}}
 *   ]
 * @param sourceIds handleInfo的sourceId 输入桩的ID
 * @returns 输入桩的运行时数据数组，按照sourceIds 中的顺序排列，即按照桩的顺序自上而下给出数据
 */
export function getResultsForRunning(sourceIds: string[]) {
  // 拿取当前的数据快照
  const nodeSelectedResultData = useStore.getState().nodeSelectedResultData;
  const nodeResultData = useStore.getState().nodeResultData;

  const dataList = sourceIds.map((key) => nodeSelectedResultData[key]);

  let results: any[] = dataList.map((data, index) => {
    const { selectedResultsType, selectedResults } = data;

    if (selectedResultsType === SelectedResultsType.TEXT) {
      // text -> 直接返回数据
      return selectedResults;
    } else if (selectedResultsType === SelectedResultsType.URL) {
      // url -> 直接返回数据
      return selectedResults;
    } else if (selectedResultsType === SelectedResultsType.ID) {
      // id -> 根据selectedResults 中存储的Index 从Store的nodeResultData 中获取数据
      const currentNodeResultData = nodeResultData[sourceIds[index]] ?? [];
      const filterSelectedResults = Object.entries(selectedResults).flatMap(([nodeIndex, indices]) => {
        // batchIndex_itemIndex 转换为正序索引
        const idx = Number(nodeIndex.split("_")[1]) + currentNodeResultData.length;
        const group = currentNodeResultData[idx];
        if (!group) return [];

        return (indices as number[])?.map((i) => group[i]).filter(Boolean);
      });

      return filterSelectedResults;
    } else if (selectedResultsType === SelectedResultsType.TEXT_LIST) {
      // text_list -> 根据selectedResults 中存储的Index 从Store的nodeResultData -> result 中获取数据
      const currentNodeResultData = nodeResultData[sourceIds[index]] ?? [];

      const filterSelectedResults = Object.entries(selectedResults).flatMap(([nodeIndex, indices]) => {
        // batchIndex_itemIndex 转换为正序索引
        const idx = Number(nodeIndex.split("_")[1]) + currentNodeResultData.length;

        // 获取当前批次的数据组
        const group = currentNodeResultData[idx];

        // TEXT_LIST 类型的结构通常是 [[{ result: [...] }]] 或者类似的嵌套结构
        // 这里假设 group[0] 是包含 result 数组的对象
        const resultList = group?.[0]?.result;

        if (!resultList || !Array.isArray(resultList)) return [];

        // 保持一致性： {id, data } 追加 result 字段
        return (indices as number[])
          .map((i) => {
            const item = resultList[i];
            if (!item) return null;

            return {
              ...item,
              result: formatDisplayValue(item.data),
            };
          })
          .filter(Boolean);
      });

      return filterSelectedResults;
    } else {
      // 其他情况 -> 返回空数组
      return [];
    }
  });
  return results;
}

/**
 * Hooks - 获取节点的上游文本输入
 *
 * @param id 节点ID
 * @returns 上游输入的计数器
 * @description 上游输入的计数器，key 为上游节点的 handleIndex，value 为上游节点的 counter
 * @returns { counter: number, handleCounters: HandleCounter }
 *
 * @example
 * const { counter, handleCounters } = useUpstreamInputs("node_1");
 * // counter = 3
 * // handleCounters = { 0: 1, 1: 2 }
 */
export function useUpstreamInputs(id: string) {
  const edges = useStore((s) => s.edges);
  const nodeSelectedResultData = useStore((s) => s.nodeSelectedResultData);

  const { counter, handleCounters } = useMemo(() => {
    // 1. 获取上游节点ID列表
    const upstreamEdges = edges.filter((e) => e.target === id);

    // 2. 一次性处理所有上游输入，避免重复JSON解析
    let counter = 0;
    let handleCounters: HandleCounter = {};
    upstreamEdges.map((item) => {
      const edgeIndex = Number(item.targetHandle?.split("_")[1] || 0);
      const sourceId = item.source;
      const rawValue = nodeSelectedResultData?.[sourceId] ?? {};

      if (!handleCounters[edgeIndex]) {
        handleCounters[edgeIndex] = 0;
      }
      handleCounters[edgeIndex] += rawValue.counter || 0;
      return;
    });

    counter = Object.values(handleCounters).reduce((acc, cur) => acc + cur, 0);

    return {
      counter,
      handleCounters,
    };
  }, [edges, nodeSelectedResultData, id]);

  return { counter, handleCounters };
}

/**
 * 所有逻辑节点自身的数据基类
 * */
export interface runtimeParameter {}

/**
 * 文本输入(text input) 数据节点组件运行时数据
 */
export interface NodeTextInputRuntimeData extends runtimeParameter {
  content: string;
  textareaHeight: number;
  title: string;
}

/**
 * 图片输入(image input) 数据节点组件运行时数据
 */
export interface NodeImageInputRuntimeData extends runtimeParameter {
  imageUrl: string;
  uploadSuccess: boolean; // 图片上传是否成功
  title: string;
}

/**
 * 视频输入(video input) 数据节点组件运行时数据
 */
export interface NodeVideoInputRuntimeData extends runtimeParameter {
  videoUrl: string;
  uploadSuccess: boolean; // 视频上传是否成功
  title: string;
}

/**
 * 音频输入(audio input) 数据节点组件运行时数据
 */
export interface NodeAudioInputRuntimeData extends runtimeParameter {
  inputValue: string;
  audioUrl: string; // 已经提交的音频文件
  title: string;
}

// NodeTextToImage 节点运行时数据
export interface NodeTextToImageRuntimeData extends runtimeParameter {
  aspectRatioIndex: number;
  modelIndex: number;
  title: string;
}

// NodeImageToImage 节点运行时数据
export interface NodeImageToImageRuntimeData extends runtimeParameter {
  aspectRatioIndex: number;
  imageModelIndex: number;
  title: string;
}

/**
 * 图片样式生成（Style Image Generation）节点运行时数据
 */
export interface NodeStyleImageGenRuntimeData extends runtimeParameter {
  aspectRatioIndex: number;
  imageModelIndex: number;
}

/**
 * 文本转视频（Text to Video）节点运行时数据
 */
export interface NodeTextToVideoRuntimeData extends runtimeParameter {
  modelIndex: number;
  aspectRatioIndex: number;
  durationIndex: number;
  title: string;
}

/**
 * 图片转视频（Image to Video）节点运行时数据
 */
export interface NodeImageToVideoRuntimeData extends runtimeParameter {
  modelIndex: number;
  aspectRatioIndex: number;
  durationIndex: number;
  resolutionIndex: number;
  title: string;
}

/**
 * 批量添加环境音效到视频（Batch Add Ambient Sound to Video）节点运行时数据
 */
export interface NodeAddSoundToVideoRuntimeData extends runtimeParameter {
  modelIndex: number;
  title: string;
}

/**
 * 批量视频唇形同步（Batch Video Lip Sync）节点运行时数据
 */
export interface NodeVideoLipSyncRuntimeData extends runtimeParameter {
  fillModelIndex: number; // 视频填充模型索引
  modelIndex: number; // 视频模型索引
  title: string;
}

/**
 * 文本转语音（Text to Speech）节点运行时数据
 */
export interface NodeTextToSpeechRuntimeData extends runtimeParameter {
  modelIndex: number; // 音频模型索引
  languageIndex: number; // 语言索引
  voiceIndex: number; // 语音索引
  title: string;
}

/**
 * 音乐生成（Musics Generator）节点运行时数据
 */
export interface NodeGenerateMusicsRuntimeData extends runtimeParameter {
  modelIndex: number;
  musicSettings: string;
  title: string;
}

/**
 * 视频编辑（Video Editor）节点运行时数据
 */
export interface NodeVideoEditorRuntimeData extends runtimeParameter {
  snapshot: ProjectData;
}

/**
 * 旋律生成（Melody Generator）节点运行时数据
 */
export interface NodeGenerateMelodyRuntimeData extends runtimeParameter {
  modelIndex: number; // 音频模型索引
  durationIndex: number; // 时长索引
  title: string;
}

/**
 * 文本分割（Text Split）节点运行时数据
 */
export interface NodeTextSplitRuntimeData extends runtimeParameter {
  content: string;
  modelIndex: number;
  title: string;
}
