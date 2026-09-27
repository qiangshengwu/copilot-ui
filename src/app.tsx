import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 全局唯一 QueryClient。
// retry:false 与原手写 fetch 行为一致（失败不自动重试）；staleTime 0 保证引导/切租户时按需刷新。
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * UmiJS 运行时 rootContainer：在最外层包裹 QueryClientProvider。
 * 与 antd 插件的 rootContainer 自动嵌套组合。
 */
export function rootContainer(container: ReactNode) {
  return <QueryClientProvider client={queryClient}>{container}</QueryClientProvider>;
}
