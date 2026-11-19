import { message } from 'antd';
import { getLocale } from '@umijs/max';
import { authFetch, HttpError } from './http';

const T = (zh: string, en: string) =>
  getLocale().toLowerCase().startsWith('zh') ? zh : en;

/**
 * openapi-fetch 的 fetch 适配器：
 * - 鉴权/401 统一交给 authFetch（401 时 LoginGate 会切回登录页）；
 * - 403/409 给出业务提示；
 * - 非 2xx 抛 HttpError，由调用方决定是否展示。
 */
export const interceptorFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (
    init?.body &&
    !(init.body instanceof FormData) &&
    !(init.body instanceof ReadableStream) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await authFetch(input, {...init, headers});

  if (response.status === 403) {
    message.error(T('没有权限访问该资源', 'You do not have permission to access this resource'));
  }
  if (response.status === 409) {
    message.error(T('请求冲突', 'Request conflict'));
  }
  if (!response.ok) {
    let detail = response.statusText;
    try {
      // 只读取一次；业务层若还需要 body，可从 HttpError.response 重新 clone（部分实现不支持）。
      const text = await response.clone().text();
      if (text) detail = `${response.statusText} ${text.slice(0, 200)}`;
    } catch {
      /* ignore */
    }
    throw new HttpError(response.status, detail || T('请求失败', 'Request failed'), response);
  }
  return response;
};
