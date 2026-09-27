import { getLogin } from '@/utils/token';
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
      // Copilot 内嵌于平台、无独立登录页：不跳转（避免破坏宿主），抛出由调用方/初始化流程处理
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
