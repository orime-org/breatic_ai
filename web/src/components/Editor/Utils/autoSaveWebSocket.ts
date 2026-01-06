// utils/autoSaveWebSocket.ts
import AuthenticatedHelper from "../../../libs/authenticated-helper";
import editService from "@/libs/edit-service";

export interface AutoSaveWSOptions {
  url: string;
  workflowId: string,
  updateToken: string,
  onMessage?: (msg: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
  reconnectInterval?: number; // 初始重连间隔（毫秒）
  maxReconnectInterval?: number; // 最大重连间隔（毫秒）
  maxRetries?: number; // 最大重连次数（默认无限）
}

export class AutoSaveWebSocket {
  private ws: WebSocket | null = null;
  private options: AutoSaveWSOptions;
  private reconnectAttempts = 0;
  private manuallyClosed = false;
  private shouldStopReconnect = false; // 是否应该停止重连（当收到 code 10000 时）

  constructor(options: AutoSaveWSOptions) {
    // 自动重连，默认 3 秒间隔
    this.options = {
      reconnectInterval: 3000,
      maxReconnectInterval: 30 * 1000, // 最长 30 秒
      ...options,
    };
    this.connect();
  }

  /** 连接 WebSocket */
  private connect() {
    const { url, workflowId, updateToken, onMessage, onOpen, onClose, onError } = this.options;

    // 获取用户信息和 token
    const authInfo = AuthenticatedHelper.getAuthenticatedInfo();
    // 修正 token 格式，移除多余的换行符
    const token = authInfo?.state.token ? authInfo.state.token.trim() : "";
    // 获取当前语言设置
    // const language = localStorage.getItem("language") || "en";
    const language = "en";

    this.ws = new WebSocket(`${url}?token=${token}&lang=${language}&workflow_id=${workflowId}&update_token=${updateToken}`);

    this.ws.onopen = () => {
      console.log("✅ WebSocket connected");
      this.reconnectAttempts = 0; // 重置计数
      onOpen?.();
    };

    this.ws.onmessage = (event) => {
      try {
        // 尝试解析响应内容
        const data = JSON.parse(event.data);
        // 如果 code 是 10000，停止重连
        if (data.code === 10000) {
          console.warn("⚠️ Received code 10000, stopping reconnection:", data.msg);
          this.shouldStopReconnect = true;
          this.ws?.close(); // 关闭连接
          editService.notifyInvalidate();
          return;
        }
      } catch (e) {
        // 如果不是 JSON 格式，忽略解析错误
      }
      onMessage?.(event.data);
    };

    this.ws.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
      console.log(JSON.stringify(err));
      onError?.(err); // ❗ 不在这里重连，等待 onclose 触发
    };

    this.ws.onclose = () => {
      onClose?.();
      console.log("🔒 WebSocket closed");

      if (!this.manuallyClosed) this.tryReconnect();
    };
  }

  /**
   * 指数退避重连
   * @description 每次重连间隔增加一倍，最大间隔为 maxReconnectInterval，最多重连 maxRetries 次
   *  reconnectInterval = 1000ms， maxReconnectInterval = 30000ms， maxRetries = 10
   *    第 1 次重连：1000ms
   *    第 2 次重连：2000ms
   *    第 3 次重连：4000ms
   *    第 4 次重连：8000ms
   *    第 5 次重连：16000ms
   *    第 6 次重连：30000ms（maxReconnectInterval）
   *    第 7 次重连：30000ms（maxReconnectInterval）
   *    第 8 次重连：30000ms（maxReconnectInterval）
   *    第 9 次重连：30000ms（maxReconnectInterval）
   *    第 10 次重连：30000ms（maxReconnectInterval）
   * @returns {void}
   */
  private tryReconnect() {
    const { reconnectInterval, maxReconnectInterval, maxRetries } = this.options;

    // 如果收到 code 10000，停止重连
    if (this.shouldStopReconnect) {
      console.warn("⚠️ Stopping reconnection due to code 10000");
      return;
    }

    if (maxRetries && this.reconnectAttempts >= maxRetries) {
      console.warn("⚠️ Reached max reconnection attempts");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1), maxReconnectInterval!);

    console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt #${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /** 发送消息 */
  public send(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn("⚠️ WebSocket not open, message dropped:", message);
    }
  }

  /** 手动关闭连接（停止自动重连） */
  public close() {
    this.manuallyClosed = true;
    this.ws?.close();
  }

  public get readyState(): number | undefined {
    return this.ws?.readyState;
  }
}
