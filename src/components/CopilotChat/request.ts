import createClient from 'openapi-fetch';
import type { paths } from '@/types/copilot';

/**
 * 组件默认使用全局 fetch：鉴权、代理、401 刷新由宿主统一拦截处理。
 * 如果宿主使用 axios/自定义 fetch 包装，可把兼容的 fetch 实现通过 props 传入。
 *
 * 依赖 openapi-fetch 0.17.0，方法名为大写：GET/POST/PATCH/DELETE。
 */
export function createCopilotClient(
  baseUrl: string,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): ReturnType<typeof createClient<paths>> {
  return createClient<paths>({
    ...(baseUrl ? { baseUrl } : {}),
    fetch: fetchImpl,
  });
}
