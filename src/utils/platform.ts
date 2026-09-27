// 平台认证模块（内嵌场景：租户固定，不在此拉租户列表）。
//
// 平台后端：http://192.168.1.14:8080
//   - 登录：POST /auth/login  body {"identifier","secret","kind":"password"} -> {"token":"..."}
//
// dev 环境下前端不直连平台，统一走 /auth、/graphql 前缀（umi proxy 转发，见 config/config.ts）。
// token 持久化到 localStorage（键 copilot-platform-token）。
// 租户固定为 CURRENT_TENANT_ID（见 src/tenant.ts），agent 路由 /{workspaceID}/... 的 workspaceID 即它。

const TOKEN_KEY = 'copilot-platform-token';

// 默认平台管理员凭据。dev 下未登录时自动用它登录；
// 后续若做正式登录页 / 环境注入，应替换掉这里的硬编码。
const DEFAULT_IDENTIFIER = 'admin';
const DEFAULT_SECRET = '12345678';

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
// 平台调用（均走 /auth 前缀，由 dev proxy 转发）
// ============================================================

/** 登录平台；成功后写入 token 缓存 */
export async function login(
  identifier: string = DEFAULT_IDENTIFIER,
  secret: string = DEFAULT_SECRET,
): Promise<string> {
  const resp = await fetch('/auth/login', {
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
