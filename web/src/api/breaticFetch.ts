import { fetchEventSource } from "@microsoft/fetch-event-source";
import AuthenticatedHelper from "../libs/authenticated-helper";
import authService from "../libs/auth-service";
import editService from "../libs/edit-service";

// @ts-ignore
import netErrorLanguage from "../i18n/net-i18n";
import { getMessageApi } from "./messageApi";

import { HAS_ACCOUNT_MODE } from "../libs/global-config";

export const host = process.env.API_URL || "";

const getTranslation = (key: string) => {
  // const language = localStorage.getItem("language") || "en-US";
  const language = "en";
  netErrorLanguage.changeLanguage(language);
  return netErrorLanguage.t(key);
};

export type Result = {
  success: boolean;
  result: any;
};

interface EventSourceOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  onmessage?: (ev: { event: string; data: string }) => void;
  onerror?: (err: Error) => void;
  onopen?: (response: Response) => Promise<void>;
  onclose?: () => void;
  signal?: AbortSignal;
}

/**
 * 封装的 fetchEventSource 方法，自动添加用户 token
 * @param url 请求地址
 * @param options 请求选项
 */
export const breaticFetchEventSourceWithAuth = async (apiPath: string, options: EventSourceOptions) => {
  const messageApi = getMessageApi();
  // 获取用户信息和 token
  const authInfo = AuthenticatedHelper.getAuthenticatedInfo();

  // 修正 token 格式，移除多余的换行符
  const token = authInfo?.state.token ? authInfo.state.token.trim() : null;

  // 获取当前语言设置
  // const language = localStorage.getItem("language") || "en";
  const language = "en";

  // 合并请求头，添加授权信息和语言设置
  const headers = {
    "Content-Type": "application/json",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Accept-Language": language,
    ...options.headers,
  };

  // 调用原始 fetchEventSource 方法
  return fetchEventSource(`${host}${apiPath}`, {
    method: options.method,
    headers,
    body: options.body,
    signal: options.signal,
    openWhenHidden: true, // 页面隐藏时保持连接
    onclose: options.onclose,
    // 自定义处理 onmessage，只传递 message 类型的事件
    onopen: async (response) => {
      if (response.status === 401) {
        // message.error(getTranslation("unauthorized_error"));
        // 使用认证服务执行登出
        if (HAS_ACCOUNT_MODE) {
          await authService.logout();
        } else {
          console.log("Server Running type Error");
          // 🔥 关键：抛错，fetchEventSource 会立刻终止连接
          throw new Error("SSE_ABORT_401");
        }
      }
      if (response.status === 409) {
        console.warn("SSE aborted due to 409 conflict");

        // 可选：给用户提示
        console.log("Invalid update token");
        await editService.notifyInvalidate();

        // 🔥 关键：抛错，fetchEventSource 会立刻终止连接
        throw new Error("SSE_ABORT_409");
      }

      if (!response.ok) {
        throw new Error(`SSE failed: ${response.status}`);
      }else{
        // 调用自定义 onopen 处理
        if (options.onopen) await options.onopen(response);
      }

      // 返回 void，允许继续建立 SSE
      return;
    },
    onmessage: (event) => {
      if (event.event === "ping") {
        console.log("SSE ping");
        return;
      }
      if (options.onmessage) {
        options.onmessage(event);
      }
    },
    // 添加默认错误处理
    onerror: (err) => {
      if (options.onerror) options.onerror(err);

      if (err?.message === "SSE_ABORT_401" || err?.message === "SSE_ABORT_409") {
        // 这是我们主动终止的，不算错误
        throw new Error(err.message);
      }else{
        console.error("SSE error:", err);
      }
    },
  });
};

export async function breaticGet(apiPath: string): Promise<Result> {
  const messageApi = getMessageApi();
  const authInfo = AuthenticatedHelper.getAuthenticatedInfo();
  const token = authInfo?.state.token ? authInfo.state.token.trim() : null;
  const authorization = `Bearer ${token}`;
  // const language = localStorage.getItem("language") || "en";
  const language = "en";
  let headersObj: any = {};
  if (token) {
    headersObj = {
      ...headersObj,
      authorization,
    };
  }
  if (language) {
    headersObj = {
      ...headersObj,
      "Accept-Language": language,
    };
  }
  try {
    const res = await fetch(`${host}${apiPath}`, {
      method: "GET",
      headers: headersObj,
    });
    return parseResult(res);
  } catch (error) {
    console.error("breaticGet", error);
    return {
      success: false,
      result: null,
    };
  }
}

export async function breaticPost(apiPath: string, headers: object = {}, body: object = {}): Promise<Result> {
  const messageApi = getMessageApi();
  const authInfo = AuthenticatedHelper.getAuthenticatedInfo();
  const token = authInfo?.state.token ? authInfo.state.token.trim() : null;
  const authorization = `Bearer ${token}`;

  // const language = localStorage.getItem("language") || "en";
  const language = "en";

  let headersObj: any = {
    ...headers,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headersObj = {
      ...headersObj,
      authorization,
    };
  }
  if (language) {
    headersObj = {
      ...headersObj,
      "Accept-Language": language,
    };
  }
  try {
    const res = await fetch(`${host}${apiPath}`, {
      method: "POST",
      headers: headersObj,
      body: JSON.stringify(body),
    });
    return parseResult(res);
  } catch (error) {
    console.error("breaticPost", error);
    return {
      success: false,
      result: null,
    };
  }
}

export async function breaticFetchFile(apiPath: string, headers: object = {}, body: object = {}): Promise<Result> {
  const messageApi = getMessageApi();
  const authInfo = AuthenticatedHelper.getAuthenticatedInfo();
  const token = authInfo?.state.token ? authInfo.state.token.trim() : null;
  const authorization = `Bearer ${token}`;

  // const language = localStorage.getItem("language") || "en";
  const language = "en";

  let headersObj: any = {
    ...headers,
    "Content-Type": "application/json",
  };
  if (token) {
    headersObj = {
      ...headersObj,
      authorization,
    };
  }
  if (language) {
    headersObj = {
      ...headersObj,
      "Accept-Language": language,
    };
  }
  try {
    const res = await fetch(`${host}${apiPath}`, {
      method: "POST",
      headers: headersObj,
      body: JSON.stringify(body),
    });

    // 检查响应状态
    if (!res.ok) {
      console.error("breaticFetchFile", res.statusText);
      return {
        success: false,
        result: null,
      };
    }

    // 尝试不同的大小写形式
    const contentDisposition = res.headers.get("Content-Disposition");
    let filename = "download";

    if (contentDisposition) {
      // 解析文件名
      const filenameRegex = /filename\*=UTF-8''([^;]+)/;
      const matches = filenameRegex.exec(contentDisposition);
      if (matches && matches[1]) {
        // 解码URL编码的文件名
        filename = decodeURIComponent(matches[1]);
      }
    }

    console.log("contentDisposition", contentDisposition); // 打印文件名，用于调试
    console.log("filename", filename); // 打印文件名，用于调试

    // 将响应转换为Blob
    const blob = await res.blob();

    // 创建一个临时URL
    const url = window.URL.createObjectURL(blob);

    // 创建一个隐藏的a标签用于下载
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;

    // 添加到文档并触发点击
    document.body.appendChild(a);
    a.click();

    // 清理
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return {
      success: true,
      result: { filename },
    };
  } catch (error) {
    console.error("breaticFetchFile", error);
    return {
      success: false,
      result: null,
    };
  }
}

/**
 * 文件上传
 * @param apiPath API 路径
 * @param formData FormData 对象，包含要上传的文件和其他数据
 * @param headers 额外的请求头 (注意：不要设置 Content-Type，让浏览器自动设置)
 * @returns Promise<Result>
 */
export async function breaticUploadFile(apiPath: string, formData: FormData, headers: object = {}): Promise<Result> {
  const messageApi = getMessageApi();
  const authInfo = AuthenticatedHelper.getAuthenticatedInfo();
  const token = authInfo?.state.token ? authInfo.state.token.trim() : null;
  const authorization = `Bearer ${token}`;

  // const language = localStorage.getItem("language") || "en";
  const language = "en";


  let headersObj: any = {
    ...headers,
  };

  if (token) {
    headersObj = {
      ...headersObj,
      authorization,
    };
  }

  if (language) {
    headersObj = {
      ...headersObj,
      "Accept-Language": language,
    };
  }

  try {
    const res = await fetch(`${host}${apiPath}`, {
      method: "POST",
      headers: headersObj,
      body: formData, // 直接传递 FormData，不要 JSON.stringify
    });

    // 检查响应状态
    if (!res.ok) {
      console.error("breaticUploadFile", res.statusText);

      // 尝试解析错误信息
      let errorMessage = res.statusText;
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // 如果无法解析 JSON，使用默认错误信息
      }

      messageApi?.error(getTranslation("upload_failed") + ": " + errorMessage);

      return {
        success: false,
        result: {
          error: errorMessage,
          status: res.status,
        },
      };
    }

    // 解析响应
    const result = await res.json();

    return {
      success: true,
      result: result,
    };
  } catch (error) {
    console.error("breaticUploadFile", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    messageApi?.error(getTranslation("upload_failed") + ": " + errorMessage);

    return {
      success: false,
      result: {
        error: errorMessage,
      },
    };
  }
}

export async function parseResult(res: Response): Promise<Result> {
  const messageApi = getMessageApi();
  try {
    if (!res.ok) {
      if (res.status === 401) {
        // message.error(getTranslation("unauthorized_error"));
        // 使用认证服务执行登出
        if (HAS_ACCOUNT_MODE) {
          await authService.logout();
        } else {
          console.log("Server Running type Error");
        }
      } else if (res.status === 403) {
        messageApi.error(getTranslation("forbidden_error"));
      } else if (res.status === 404) {
        messageApi.error(getTranslation("not_found_error"));
      } else if (res.status === 409) {
        console.log("Invalid update token");
        await editService.notifyInvalidate();
      }else if (res.status === 500) {
        messageApi.error(getTranslation("server_inner_error"));
      } else {
        messageApi.error(`${getTranslation("method_not_allowed_error")}: ${res.statusText}`);
      }
      return {
        success: false,
        result: null,
      };
    }
    const result = await res.json();
    return {
      success: res.ok,
      result,
    };
  } catch (error) {
    console.error("parseResult", error);
    return {
      success: false,
      result: null,
    };
  }
}
