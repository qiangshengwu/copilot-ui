import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Tenant } from '@/types';
import { fetchTenants, getCurrentTenantId, setCurrentTenantId } from '@/utils/platform';

/**
 * 租户列表（react-query useQuery）+ 当前租户 id 读写。
 * 首次拉到租户后：优先选 localStorage 中仍存在的，否则取第一个，并回写模块级 currentTenantId。
 * 失败时与原实现一致：列表为空，picked 为 ''。
 */
export function useTenant() {
  const tenantsQ = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
    staleTime: 5 * 60 * 1000, // 租户列表低频变动，fetchTenants 本身也有模块缓存
  });

  const [tenantId, setTenantId] = useState('');
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    // 等首次请求结束（成功或失败）再决定当前租户
    if (!tenantsQ.isFetched) return;
    bootedRef.current = true;
    const list = tenantsQ.data || [];
    const stored = getCurrentTenantId();
    const picked = list.find((t) => t.id === stored)?.id || list[0]?.id || '';
    setCurrentTenantId(picked);
    setTenantId(picked);
  }, [tenantsQ.isFetched, tenantsQ.data]);

  /** 切换租户：仅持久化 + 更新状态；会话重置由组合层（页面）调用 resetOnTenant */
  const selectTenant = useCallback((v: string) => {
    setCurrentTenantId(v);
    setTenantId(v);
  }, []);

  return {
    tenants: tenantsQ.data ?? [],
    tenantId,
    selectTenant,
  };
}
