import { getLogin, delLogin } from '@/utils/token';
import { message } from 'antd';

const originalFetch = window.fetch;

if (!originalFetch) {
  throw new Error('当前环境不支持 fetch，请使用 polyfill');
}

class FetchError extends Error {
  public errorCode: number;
  public response?: Response;

  constructor(errorCode: number, message: string, response?: Response) {
    super(message);
    this.name = 'FetchError';
    this.errorCode = errorCode;
    this.response = response;
  }
}

export const interceptorFetch = async (...args: any[]) => {
  let [resource, options = {}] = args;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  const login = getLogin();
  if (login && login.token) {
    headers.Authorization = `Bearer ${login.token}`;
  }

  const isFormData = options.body instanceof FormData;
  const isStream = options.body instanceof ReadableStream;

  if (!isFormData && !isStream && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const authOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await originalFetch(resource, authOptions);

    if (response.status === 401) {
      // 内嵌平台、无独立登录页：不跳登录页（避免破坏宿主）。
      // token 过期时清除本地 token 并触发一次自动重登（getInitialState 会重新登录）；
      // 用 sessionStorage 标记防抖，避免连续 401 反复 reload 死循环。
      delLogin();
      if (typeof window !== 'undefined' && !sessionStorage.getItem('copilot_auth_reloading')) {
        sessionStorage.setItem('copilot_auth_reloading', '1');
        window.location.reload();
      }
      throw new FetchError(401, '未登录或登录已过期', response);
    }

    if (response.status === 403) {
      message.error('没有权限访问该资源');
    }

    if (response.status === 409) {
      message.error('请求冲突');
    }

    if (!response.ok) {
      throw new FetchError(response.status, response.statusText || '请求失败', response);
    }

    return response;
  } catch (error: any) {
    console.error('fetch 请求异常:', error);

    // 只在非自定义错误时提示
    if (!(error instanceof FetchError)) {
      message.error('网络异常，请稍后重试');
    }

    throw error;
  }
};
