import { delLogin, getLogin, tokenExpired } from '@/utils/token';

/** 认证失效事件：由 LoginGate 监听并切回登录页，避免整页 reload 丢失任务状态。 */
export const AUTH_UNAUTHORIZED_EVENT = 'copilot:unauthorized';

export class HttpError extends Error {
  status: number;
  response?: Response;

  constructor(status: number, message: string, response?: Response) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.response = response;
  }
}

function notifyUnauthorized() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  }
}

/**
 * 统一鉴权 fetch：
 * - 自动注入当前 Bearer token；
 * - 401 时清除本地登录态并派发 copilot:unauthorized（由 LoginGate 切回登录页）；
 * - 不自动重试，调用方按业务决定是否重试/提示。
 *
 * SSE、任务轮询、GraphQL、REST 都必须走这里，避免各写一套 token/401 逻辑。
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const login = getLogin();
  const headers = new Headers(init.headers);
  if (login?.token && !tokenExpired(login.token)) {
    headers.set('Authorization', `Bearer ${login.token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'same-origin',
  });

  if (response.status === 401) {
    delLogin();
    notifyUnauthorized();
  }
  return response;
}
