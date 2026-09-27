/**
 * 平台认证（HTTP REST，非 GraphQL）。
 *
 * 为什么 login 必须走 HTTP：GraphQL 端点要求请求携带已鉴权的 `Authorization: Bearer <token>`，
 * 而登录（换取 token）时还没有 token，走 graphql 会因无鉴权被拒绝。
 * 因此统一用平台 HTTP REST 接口 `POST /auth/login`（magistrala auth），返回 snake_case 的 LoginResponse。
 */

/** 平台 HTTP 登录请求（POST /auth/login） */
export interface AuthLoginRequest {
  identifier: string;
  secret: string;
  kind?: 'password' | 'api_key' | 'certificate';
}

/** 平台 HTTP 登录响应（magistrala auth LoginResponse，snake_case） */
export interface AuthLoginResponse {
  /** ES256-signed JWT */
  token: string;
  /** 登录实体（用户）UUID */
  entity_id: string;
  /** 会话 UUID */
  session_id: string;
  /** 过期时间（date-time） */
  expires_at: string;
}

/**
 * 使用 HTTP REST 登录平台并返回 token。
 * 经同源代理（dev /auth/login → 后端；生产 nginx 同源）调用。
 */
export async function apiLogin(input: AuthLoginRequest): Promise<AuthLoginResponse> {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`login failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as AuthLoginResponse;
}
