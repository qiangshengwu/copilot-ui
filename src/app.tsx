import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { graphqlClient } from '@/utils/graphql/client';
import { getLogin, setTenant, tokenExpired, delLogin } from '@/utils/token';
import {
  ListTenantsDocument,
  type ListTenantsQuery,
  type ListTenantsQueryVariables,
  type GetTenantQuery,
} from '@/graphql/generated/graphql';

/**
 * 启动初始化：只读取已有登录态并加载默认租户；不再内置任何账号密码。
 * 未登录/过期时返回空状态，由 LoginGate 展示账号密码登录页。
 */
export async function getInitialState(): Promise<{ tenant?: GetTenantQuery['tenant'] }> {
  const login = getLogin();
  if (!login?.token || tokenExpired(login.token)) {
    delLogin();
    return {};
  }

  try {
    const res = await graphqlClient<ListTenantsQuery, ListTenantsQueryVariables>({
      query: ListTenantsDocument,
      variables: { limit: 10, offset: 0 },
    });
    const tenant = res.tenants?.items?.[0];
    if (tenant) setTenant(tenant);
    return { tenant };
  } catch (e) {
    console.warn('[copilot] fetch tenants failed:', e);
    return {};
  }
}

// react-query 全局 Provider：会话列表无限滚动（useInfiniteQuery）等依赖此客户端。
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export function rootContainer(container: ReactNode) {
  return <QueryClientProvider client={queryClient}>{container}</QueryClientProvider>;
}
