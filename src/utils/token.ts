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
  if (login !== null) {
    return JSON.parse(login);
  }
  return undefined;
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

/** 判断 JWT 是否已过期（按 exp 字段；非 JWT / 无 exp 视为未过期） */
export function tokenExpired(token?: string): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false; // 非 JWT，无法判断，按有效处理
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    if (typeof payload?.exp === 'number') return payload.exp * 1000 <= Date.now();
  } catch {
    /* 解码失败：不拦截，按有效处理 */
  }
  return false;
}
