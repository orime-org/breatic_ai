import { RenameProjectPayload } from "../libs/interfaces";
import { breaticGet, breaticPost, Result } from "./breaticFetch";

class DashboardApi {
  constructor() {}

  /**
   * 获取工作流列表
   * @description 调用 API 获取分页工作流列表
   * @param {number} pageNum - 页码
   * @param {number} pageSize - 每页工作流数
   * @returns {Promise<Result>} 包含工作流列表结果的 Promise
   */
  async getProjectListByPage(pageNum: number, pageSize: number): Promise<Result> {
    return await breaticGet(`/api/workflow/base/query?pageSize=${pageSize}&pageNum=${pageNum}`);
  }
  /**
   * 复制工作流
   * @description 调用 API 复制指定工作流
   * @param {string} projectId - 要复制的工作流 ID
   * @returns {Promise<Result>} 包含复制结果的 Promise
   */
  async copyProject(projectId: string): Promise<Result> {
    return await breaticPost(`/api/workflow/base/copy/${projectId}`, {}, {});
  }
  /**
   * 删除工作流
   * @description 调用 API 删除指定工作流
   * @param {string} projectId - 要删除的工作流 ID
   * @returns {Promise<Result>} 包含删除结果的 Promise
   */
  async deleteProject(projectId: string): Promise<Result> {
    return await breaticPost(`/api/workflow/base/delete/${projectId}`, {}, {});
  }
  /**
   * 更新工作流名称
   * @description 调用 API 更新指定工作流的名称
   * @param {RenameProjectPayload} values - 包含工作流 ID 和新名称的对象
   * @returns {Promise<Result>} 包含更新结果的 Promise
   */
  async renameProject(values: RenameProjectPayload): Promise<Result> {
    return await breaticPost(`/api/workflow/base/save`, {}, values);
  }

  /**
   * 获取节点执行结果数据
   * @description 调用 API 获取节点执行结果数据
   * @param {string} nodeId - 节点ID
   * @returns {Promise<Result>} 包含节点执行结果数据结果的 Promise
   */
  async getNodeExecuteResult(nodeId: string, workflowId: string, updateToken: string): Promise<Result> {
    return await breaticGet(`/api/workflow/node/results/${nodeId}?workflow_id=${workflowId}&update_token=${updateToken}`);
  }
}
export default new DashboardApi();
