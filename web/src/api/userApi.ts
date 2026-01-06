import {
  GetRechargeRecordPayload,
  UsageRecordPayload,
  GetObtainedRecordPayload
} from "../libs/interfaces";
import { breaticGet, breaticPost, Result } from "./breaticFetch";

class UserApi {
  constructor() { }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<Result> {
    return await breaticGet("/api/user/info");
  }

  /**
   * 获取积分详情
   */
  async getCreditsRecord(): Promise<Result> {
    return await breaticGet(`/api/transaction/credits_record`);
  }

  /**
   * 获取积分使用记录
   */
  async getUsageRecordByPage(values: UsageRecordPayload): Promise<Result> {
    return await breaticPost(`/api/transaction/usage_record`, {}, values);
  }

  /**
   * 获取积分获取记录
   */
  async getObtainedRecordByPage(values: GetObtainedRecordPayload): Promise<Result> {
    return await breaticPost(`/api/transaction/obtained_record`, {}, values);
  }

  /**
   * 获取充值记录
   */
  async getRechargeRecordByPage(values: GetRechargeRecordPayload): Promise<Result> {
    return await breaticPost(`/api/transaction/recharge_record`, {}, values);
  }
  /**
   * 上传图片
   */
  async fileUpload(values: { file: File }): Promise<Result> {
    return await breaticPost(`/api/oss/file/upload`, {}, values);
  }
}
export default new UserApi();
