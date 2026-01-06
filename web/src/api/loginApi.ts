import { breaticGet, breaticPost, parseResult, Result } from "./breaticFetch";

class LoginApi {
  constructor() {}

  /**
   * Google 登录
   * @description 调用 API 进行 Google 登录
   * @param {string} values.token - Google 登录凭证
   * @returns {Promise<Result>} 包含登录结果的 Promise
   */
  async googleLogin(values: { token: string }): Promise<Result> {
    return await breaticPost("/api/auth/google/login", {}, values);
  }

  /**
   * 获取邮箱验证码
   * @description 调用 API 发送邮箱验证码
   * @param {string} values.email - 目标邮箱地址
   * @returns {Promise<Result>} 包含发送结果的 Promise
   */
  async sendEmailCode(values: { email: string }): Promise<Result> {
    return await breaticPost("/api/auth/email/send_code", {}, values);
  }
  /**
   * 验证码验证
   * @description 调用 API 验证用户输入的验证码
   * @param {string} values.captchaVerifyParam - 验证码验证参数
   * @param {number} values.scene - 验证码场景（1: 登录，2: 注册）
   * @returns {Promise<Result>} 包含验证结果的 Promise
   */
  async captchaVerify(values: { captchaVerifyParam: string; scene: number }): Promise<Result> {
    return await breaticPost("/api/captcha/verify", {}, values);
  }
  /**
   * 获取手机验证码
   * @description 调用 API 发送手机验证码
   * @param {string} values.mobile - 目标手机号
   * @param {number} values.scene - 验证码场景（1: 登录，2: 注册）
   * @param {string} values.ticket - 验证码票据
   * @returns {Promise<Result>} 包含发送结果的 Promise
   */
  async sendSmsCode(values: { mobile: string; scene: number; ticket: string }): Promise<Result> {
    return await breaticPost("/api/user/auth/send-sms-code", {}, values);
  }
  /**
   * 手机登录
   * @description 调用 API 进行手机登录
   * @param {string} values.code - 验证码
   * @param {string} values.mobile - 目标手机号
   * @param {string} values.ticket - 验证码票据
   * @returns {Promise<Result>} 包含登录结果的 Promise
   */
  async smsLogin(values: { code: string; mobile: string; ticket: string }): Promise<Result> {
    return await breaticPost("/api/user/auth/sms-login", {}, values);
  }
  /**
   * 邮箱登录
   * @description 调用 API 进行邮箱登录
   * @param {string} values.code - 验证码
   * @param {string} values.email - 目标邮箱地址
   * @returns {Promise<Result>} 包含登录结果的 Promise
   */
  async emailLogin(values: { code: string; email: string }): Promise<Result> {
    return await breaticPost("/api/auth/email/login", {}, values);
  }
  /**
   * 退出登录
   * @description 调用 API 退出当前登录会话
   * @returns {Promise<Result>} 包含退出结果的 Promise
   */
  async logout(): Promise<Result> {
    return await breaticGet("/api/auth/logout");
  }
}
export default new LoginApi();
