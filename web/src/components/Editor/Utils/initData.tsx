// 从服务器获取数据
import { type NodeCompleteTemplateData, type NodeExecResults, NODE_EXECUTE_STATUS_CODE } from "../Types/types";
import editorApi from "../../../api/editorApi";
import useStore from "../Store/store";
import { SelectedResultsType } from "../Types/runtimeData";

/**
 * 初始化节点模板数据
 * 始终从服务器获取最新的节点模板数据，不使用本地缓存
 */
export async function initNodeTemplateData(): Promise<NodeCompleteTemplateData> {
  const res = await editorApi.getWorkflowNodeTemplateData();


  // 统一从 Result
  const extractData = (r: any) => {
    const hasSuccessFlag = r && typeof r.success === "boolean";
    const payload = hasSuccessFlag ? r.result : r;
    return payload?.data ?? payload;
  };

  const payload: any = extractData(res);

  if (!payload) {
    throw new Error("Invalid NodeTemplateData: expected object with version and data array");
  }

  // 验证顶层结构
  if (typeof payload.version !== "string" || !Array.isArray(payload.data)) {
    throw new Error("Invalid NodeTemplateData: expected object with version (string) and data (array)");
  }

  // 归一化单个 NodeTemplateDetail
  const normalizeItem = (item: any) => {
    if (typeof item?.template_name !== "string" || typeof item?.template_code !== "number" || typeof item?.template_icon !== "string" || typeof item?.membership_level !== "number" || typeof item?.remark !== "string" || item?.content === undefined) {
      throw new Error(`Invalid NodeTemplateDetail: template_name/template_code/template_icon/membership_level/remark/content invalid for item: ${JSON.stringify(item)}`);
    }
    return {
      template_name: item.template_name,
      template_code: item.template_code,
      template_icon: item.template_icon,
      membership_level: item.membership_level,
      remark: item.remark,
      content: item.content,
    };
  };

  // 处理 data 数组中的每个 item
  const normalizedData = payload.data.map((item: any, index: number) => {
    try {
      return normalizeItem(item);
    } catch (error) {
      console.error(`处理第 ${index} 个 item 时出错:`, error);
      throw error;
    }
  });

  // 构建最终的 NodeCompleteTemplateData 结构
  const normalized: NodeCompleteTemplateData = {
    version: payload.version,
    data: normalizedData,
  };

  // 更新 store 中的数据
  useStore.setState({ nodeTemplateData: normalizedData });
  useStore.setState((state) => ({
    workflowInfo: { ...(state.workflowInfo || {}), workflow_version: payload.version },
  }));

  return normalized;
}

/**
 * 解析节点执行结果数据
 * - 只解析，不存
 * @param node_exec_results 节点执行结果数据
 * @returns 解析后的节点执行结果数据
 */
const parseResultData = (node_exec_results: NodeExecResults) => {
  const records = node_exec_results.records;
  let nodeRuntimeData = {} as Record<string, any>;

  records.map((record: any) => {
    const nodeId = record.node_id || "";
    const content = record.node_content || {};
    const execResult = record.exec_result || {};
    const nodeExecId = record.id || "";

    const batchExecData = execResult.map((item: any, index: number) => {
      // 处理 selectedResultsType 为 TEXT_LIST 时， 执行结果为Error时的部分
      if (content?.extra_info?.selectedResultsType && content?.extra_info?.selectedResultsType === SelectedResultsType.TEXT_LIST && !item.result) item.result = [{ id: nodeExecId, data: item.msg }];

      return {
        index,
        id: item.id ?? "",
        status_code: item.status_code ?? NODE_EXECUTE_STATUS_CODE.SUCCESS,

        // 执行结果: 默认文本，数据类型为文本或数组，节点内部使用时针对性的ParseResult
        result: item.result ?? item.msg ?? "",

        // 上游节点的 selectedResults
        source_text: item.source_text ?? content?.image_based_blocks?.source_text ?? content?.text_based_blocks?.source_text ?? content?.audio_based_blocks?.source_text ?? content?.video_based_blocks?.source_text ?? [],
        source_image: item.source_image ?? content?.image_based_blocks?.source_image ?? [],
        source_audio: item.source_audio ?? content?.audio_based_blocks?.source_audio ?? [],
        source_video: item.source_video ?? content?.video_based_blocks?.source_video ?? [],

        credits: item.credits ?? 0,
        exec_time: item.exec_time ?? 0,
        create_time: item.create_time ?? Date.now(),
        node_exec_id: nodeExecId ?? "",
        model_id: content.model_id ?? "",
        model_name: content.extra_info?.model_name ?? "",
        model_icon_name: content.extra_info?.model_icon_name ?? "",
      };
    });

    if (!nodeRuntimeData?.[nodeId]) nodeRuntimeData[nodeId] = [];

    return nodeRuntimeData[nodeId].push(batchExecData);
  });
  return nodeRuntimeData;
};

/**
 * 获取工作流详情
 * @param workflowId 工作流 ID
 * @returns 工作流详情数据
 */
export async function initWorkflowDetail(workflowId: string): Promise<any> {
  const res = await editorApi.getWorkflowDetail(workflowId);

  // 统一从 Result
  const extractData = (r: any) => {
    const hasSuccessFlag = r && typeof r.success === "boolean";
    const payload = hasSuccessFlag ? r.result : r;
    return payload?.data ?? payload;
  };

  const payload: any = extractData(res);

  const workflowData = payload?.workflow || {};

  // 1 存储工作流信息
  // - 工作流信息
  useStore.setState({
    workflowInfo: {
      id: workflowData.id,
      workflow_version: workflowData.workflow_version,
      workflow_name: workflowData.workflow_name,
      workflow_icon: workflowData.workflow_icon,
      workflow_screen_pic: workflowData.workflow_screen_pic,
      remark: workflowData.remark,
      create_time: workflowData.create_time,
      update_time: workflowData.update_time,
    },
  });

  // 2 节点结果数据
  const nodeResultData = parseResultData(payload.node_exec_results);
  useStore.setState({ nodeResultData: nodeResultData });

  // 3 运行时数据
  useStore.setState({ nodeRuntimeData: workflowData.content?.nodeRuntimeData || {} });

  // 4 节点选中结果数据
  useStore.setState({ nodeSelectedResultData: workflowData.content?.nodeSelectedResultData || {} });

  // 5 节点数据
  useStore.setState({ nodes: workflowData.content?.nodes || [] });

  // 6 边数据
  useStore.setState({ edges: workflowData.content?.edges || [] });

  // 7、updateToken
  useStore.setState({ updateToken: payload.update_token})

  return payload.update_token;
}
