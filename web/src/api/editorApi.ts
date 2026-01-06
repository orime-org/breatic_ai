import { breaticUploadFile, breaticGet, breaticPost, Result } from "./breaticFetch";
import type { NodeStaticEnumsData, NodeWorkflowLlmsData, WorkflowNodeUploadUrlType, WorkflowNodeResultsDetailSaveType, WorkflowCreateType } from "../components/Editor/Types/types";

class EditorApi {
  constructor() {}

  /**
   * 获取指定工作流的全部节点模板数据
   * @returns {Promise<Result>} 节点模板数据查询结果
   * @description 向后端请求该 workflow 下所有节点的模板（供流程编辑器初始化使用）
   */
  async getWorkflowNodeTemplateData(): Promise<Result> {
    return await breaticGet(`/api/workflow/node/query`);
  }

  /**
   * 上传文件
   * @description 调用 API 上传文件
   * @param {string} apiPath - API 路径
   * @param {FormData} formData - 包含文件数据的 FormData 对象
   * @returns {Promise<Result>} 包含上传结果的 Promise
   */
  async uploadFile(apiPath: string, formData: FormData): Promise<Result> {
    return await breaticUploadFile(apiPath, formData);
  }

  /**
   * 创建工作流
   * @description 调用 API 创建新的工作流
   * @returns {Promise<Result>} 包含工作流创建结果的 Promise
   */
  async createWorkflow(values: WorkflowCreateType): Promise<Result> {
    return await breaticPost("/api/workflow/base/create", {}, values);
  }

  /**
   * 获取工作流详情
   * @description 调用 API 获取指定工作流的详细信息
   * @param {string} workflowId - 工作流 ID
   * @returns {Promise<Result>} 包含工作流详情结果的 Promise
   */
  async getWorkflowDetail(workflowId: string): Promise<Result> {
    return await breaticGet(`/api/workflow/base/get/${workflowId}`);
  }

  /**
   * 上传工作流节点文件
   * @description 调用 API 上传工作流节点的文件
   * @param {string} url - API 路径
   * @param {WorkflowNodeUploadUrlType} values - 包含上传文件信息的对象
   * @returns {Promise<Result>} 包含上传结果的 Promise
   */
  async postWorkflowNodeUploadUrl(url: string, values: WorkflowNodeUploadUrlType): Promise<Result> {
    return await breaticPost(url, {}, values);
  }

  /**
   * 保存工作流节点结果详情
   * @description 调用 API 保存工作流节点的结果详情
   * @param {string} url - API 路径
   * @param {WorkflowNodeResultsDetailSaveType} values - 包含节点结果详情的对象
   * @returns {Promise<Result>} 包含保存结果的 Promise
   */
  async postWorkflowNodeResultsDetailSave(url: string, values: WorkflowNodeResultsDetailSaveType): Promise<Result> {
    return await breaticPost(url, {}, values);
  }

  /**
   * 上传工作流截图
   * @description 调用 API 上传工作流的截图
   * @param {string} url - API 路径
   * @param {string} base64 - 包含 base64 编码的截图字符串
   * @returns {Promise<Result>} 包含上传结果的 Promise
   */
  async postWorkflowScreenUpload(url: string, values: { id: string; content_base64: string }): Promise<Result> {
    return await breaticPost(url, {}, values);
  }
}

export default new EditorApi();
