import createClient from 'openapi-fetch';
import type { paths } from '@/types/copilot';

/**
 * 兼容 openapi-fetch 不同大版本的请求方法命名：
 * - 旧版：client.get / post / patch / del
 * - 新版：client.GET / POST / PATCH / DELETE
 */
function normalizeClient(client: any) {
  const bind = (fn: any) => (typeof fn === 'function' ? fn.bind(client) : undefined);
  return {
    get: bind(client.get ?? client.GET),
    post: bind(client.post ?? client.POST),
    patch: bind(client.patch ?? client.PATCH),
    del: bind(client.del ?? client.delete ?? client.DELETE),
  };
}

/**
 * 组件默认使用全局 fetch：鉴权、代理、401 刷新由宿主统一拦截处理。
 * 如果宿主使用 axios/自定义 fetch 包装，可把兼容的 fetch 实现通过 props 传入。
 */
export function createCopilotClient(
  baseUrl: string,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
) {
  const client = createClient<paths>({
    ...(baseUrl ? { baseUrl } : {}),
    fetch: fetchImpl,
  });
  return normalizeClient(client);
}
