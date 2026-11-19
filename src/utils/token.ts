import { GetTenantQuery } from '@/graphql/generated/graphql';
import type { AuthLoginResponse } from '@/services/auth';

export const setLogin = (data: AuthLoginResponse) => {
  const login = JSON.stringify(data);
  return localStorage.setItem('login', login);
};

export const delLogin = () => {
  localStorage.removeItem('login');
};

export const getLogin = (): AuthLoginResponse | undefined => {
  const login = localStorage.getItem('login');
  if (login === null) return undefined;
  try {
    return JSON.parse(login) as AuthLoginResponse;
  } catch {
    // 本地缓存损坏：清理，走重新登录
    localStorage.removeItem('login');
    return undefined;
  }
};

export const setTenant = (t: GetTenantQuery['tenant']) => {
  const tenant = JSON.stringify(t);
  return localStorage.setItem('tenant', tenant);
};

export const delTenant = () => {
  localStorage.removeItem('tenant');
};

export const getTenant = (): GetTenantQuery['tenant'] | undefined => {
  const data = localStorage.getItem('tenant');
  if (data !== null) {
    return JSON.parse(data);
  }
  return undefined;
};

/** 判断 JWT 是否已过期（按 exp 字段，预留 30s 提前量；非 JWT / 无 exp 视为已过期） */
export function tokenExpired(token?: string): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true; // 平台 token 为 JWT；非 JWT 视为不可用
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    if (typeof payload?.exp === 'number') {
      return payload.exp * 1000 <= Date.now() + 30_000;
    }
  } catch {
    return true;
  }
  return true;
}
