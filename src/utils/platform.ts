// 平台（认证 + 租户列表）模块。
//
// 平台后端：http://192.168.1.14:8080
//   - 登录：POST /auth/login  body {"identifier","secret","kind":"password"} -> {"token":"..."}
//   - 租户：POST /graphql     Authorization: Bearer <token>
//
// dev 环境下前端不直连平台，统一走 /platform 前缀（umi proxy 剥离前缀转发，见 config/config.ts）。
// token 持久化到 localStorage（键 copilot-platform-token，与 copilot-base 风格一致）。
// 模块级缓存：token、租户列表、当前选中租户 id（= workspaceID，agent 路由路径段的唯一租户来源）。

import type { Tenant } from '@/types';

const TOKEN_KEY = 'copilot-platform-token';
const TENANT_ID_KEY = 'copilot-tenant-id';

// 默认平台管理员凭据。dev 下未登录时自动用它登录；
// 后续若做正式登录页 / 环境注入，应替换掉这里的硬编码。
const DEFAULT_IDENTIFIER = 'admin';
const DEFAULT_SECRET = '12345678';

const TENANTS_QUERY =
  'query($limit: Int) { tenants(limit: $limit) { total items { id name alias status } } }';

// ============================================================
// token
// ============================================================

function readStoredToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

let token: string = readStoredToken();

export function getToken(): string {
  return token;
}

export function setToken(t: string): void {
  token = t || '';
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// ============================================================
// 租户列表缓存 / 当前租户（workspaceID）
// ============================================================

let tenantsCache: Tenant[] = [];
let tenantsLoading: Promise<Tenant[]> | null = null;

/** 已缓存的租户列表（不发起请求） */
export function getTenants(): Tenant[] {
  return tenantsCache;
}

function readStoredTenantId(): string {
  try {
    return localStorage.getItem(TENANT_ID_KEY) || '';
  } catch {
    return '';
  }
}

let currentTenantId: string = readStoredTenantId();

/** 当前选中租户 id = workspaceID（agent 路由路径段唯一租户来源） */
export function getCurrentTenantId(): string {
  return currentTenantId;
}

/** 切换当前租户；同时持久化，刷新后保持选中 */
export function setCurrentTenantId(id: string): void {
  currentTenantId = id || '';
  try {
    if (currentTenantId) localStorage.setItem(TENANT_ID_KEY, currentTenantId);
    else localStorage.removeItem(TENANT_ID_KEY);
  } catch {
    /* ignore */
  }
}

// ============================================================
// 平台调用（均走 /platform 前缀，由 dev proxy 转发）
// ============================================================

/** 登录平台；成功后写入 token 缓存 */
export async function login(
  identifier: string = DEFAULT_IDENTIFIER,
  secret: string = DEFAULT_SECRET,
): Promise<string> {
  const resp = await fetch('/platform/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, secret, kind: 'password' }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`平台登录失败 HTTP ${resp.status} ${text}`.trim());
  }
  const j = (await resp.json()) as { token?: string };
  if (!j.token) throw new Error('平台登录响应缺少 token');
  setToken(j.token);
  return j.token;
}

/** 无 token 时用默认凭据自动登录（dev 便捷实现） */
export async function ensureLoggedIn(): Promise<string> {
  if (token) return token;
  return login();
}

/**
 * 拉取租户列表。未登录先自动登录；带模块级缓存与并发去重。
 * 返回 data.tenants.items[]。
 */
export async function fetchTenants(): Promise<Tenant[]> {
  if (tenantsCache.length) return tenantsCache;
  if (tenantsLoading) return tenantsLoading;
  tenantsLoading = (async () => {
    await ensureLoggedIn();
    const resp = await fetch('/platform/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: TENANTS_QUERY, variables: { limit: 200 } }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`拉取租户失败 HTTP ${resp.status} ${text}`.trim());
    }
    const j = (await resp.json()) as {
      data?: { tenants?: { items?: Tenant[] } };
    };
    tenantsCache = j?.data?.tenants?.items || [];
    return tenantsCache;
  })();
  try {
    return await tenantsLoading;
  } finally {
    tenantsLoading = null;
  }
}
