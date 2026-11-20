import createClient from 'openapi-fetch';
import type { paths } from '@/types/copilot';
import type { TokenGetter } from './context';

export type CopilotAuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** 组件内使用的鉴权 fetch：token 由宿主提供，401 交给宿主处理，不读写 localStorage。 */
export function createAuthFetch(
  getToken: TokenGetter,
  onUnauthorized?: () => void,
): CopilotAuthFetch {
  return async (input, init = {}) => {
    const headers = new Headers(init.headers);
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(input, {
      ...init,
      headers,
      credentials: init.credentials ?? 'same-origin',
    });
    if (response.status === 401) onUnauthorized?.();
    return response;
  };
}

export function createCopilotClient(
  baseUrl: string,
  authFetch: CopilotAuthFetch,
): ReturnType<typeof createClient<paths>> {
  return createClient<paths>({
    ...(baseUrl ? { baseUrl } : {}),
    fetch: authFetch as typeof fetch,
  });
}

export function apiUrl(baseUrl: string, path: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}${path.startsWith('/') ? path : `/${path}`}`;
}
