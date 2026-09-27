import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { graphqlClient } from '@/utils/graphql/client';
import { apiLogin, type AuthLoginRequest } from '@/services/auth';
import { getLogin, setLogin, setTenant, tokenExpired, delLogin } from '@/utils/token';
import {
  ListTenantsDocument,
  type ListTenantsQuery,
  type ListTenantsQueryVariables,
  type GetTenantQuery,
} from '@/graphql/generated/graphql';

/**
 * 内嵌平台场景：前端负责登录与租户选择，后端用前端传入的 Bearer token 操作平台。
 * - 登录：无有效 token 时用默认凭据调平台 HTTP REST /auth/login（不能用 graphql，graphql 端点要求已鉴权 token），结果写入 utils/token 的 localStorage。
 * - 租户：拉取租户列表，默认取第 1 条作为默认租户，托管到 initialState.tenant。
 * 组件通过 `const { initialState } = useModel('@@initialState'); const tenantId = initialState?.tenant?.id` 获取。
 */
const DEFAULT_CREDENTIALS: AuthLoginRequest = {
  identifier: 'admin',
  secret: '12345678',
  kind: 'password',
};

export async function getInitialState(): Promise<{ tenant?: GetTenantQuery['tenant'] }> {
  // 1) 确保登录 token：无 token 或已过期（平台 token 约 1 小时有效）都重新登录，
  //    否则过期 token 被一直复用会导致后续请求全部 401（表现为"创建会话失败"等）。
  let login = getLogin();
  if (!login?.token || tokenExpired(login.token)) {
    // 登录请求不能携带（无效/过期的）旧 token：graphqlClient 会对所有请求注入
    // Authorization: Bearer，若带上过期 token 平台直接以 `invalid token: ExpiredSignature`
    // 拒绝，导致永远登录失败。先清掉旧 token，让 login 请求以匿名身份换取新 token。
    delLogin();
    try {
      // login 走平台 HTTP REST（/auth/login），graphql 端点要求已鉴权的 Bearer token，登录时还没有 token。
      login = await apiLogin(DEFAULT_CREDENTIALS);
      setLogin(login);
      // 成功登录后清除"401 触发重载"的防抖标记，允许未来再次自动恢复
      sessionStorage.removeItem('copilot_auth_reloading');
    } catch (e) {
      console.warn('[copilot] platform login failed:', e);
    }
  }

  // 2) 租户列表 → 默认取第 1 条
  let tenant: GetTenantQuery['tenant'] | undefined;
  if (login?.token) {
    try {
      const res = await graphqlClient<ListTenantsQuery, ListTenantsQueryVariables>({
        query: ListTenantsDocument,
        variables: { limit: 10, offset: 0 },
      });
      tenant = res.tenants?.items?.[0];
      if (tenant) setTenant(tenant);
    } catch (e) {
      console.warn('[copilot] fetch tenants failed:', e);
    }
  }

  return { tenant };
}

// react-query 全局 Provider：会话列表无限滚动（useInfiniteQuery）等依赖此客户端。
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export function rootContainer(container: ReactNode) {
  return <QueryClientProvider client={queryClient}>{container}</QueryClientProvider>;
}
