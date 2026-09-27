// API 请求辅助。请求一律同源（dev 走 umi proxy，prod 由后端 nginx 同域反代分发）。

import type {
  AppendMessageBody,
  Conversation,
  ConversationListResp,
  HistoryMessage,
  MessageListResp,
} from '@/types';
import { getToken, setToken, login } from './platform';
import { CURRENT_TENANT_ID } from '@/tenant';

/** 拼接完整 API 地址：始终同源，返回相对路径 */
export function apiUrl(path: string): string {
  return path;
}

// ============================================================
// 历史对话 API（服务端 postgres，契约冻结）
// 后端 decodeBody 用 DisallowUnknownFields，请求体字段名必须与契约完全一致。
// 错误统一格式：{"error":"..."}
// userID / tenantID 一律由后端从 authn.Session 取，请求不再携带 user_id / tenant_id。
// ============================================================

// ============================================================
// 新路由契约：agent 路由改为 /{workspaceID}/...
//   workspaceID = 当前选中租户 id（路径段即唯一租户来源，后端忽略 body/query 的 tenant_id）
// 会话：/{workspaceID}/copilot/conversations[/:id][/messages]
// 任务：/{workspaceID}/copilot/task[/approve|/:id][/stream]
// ============================================================

/** 当前 workspaceID 下的 copilot 业务前缀：`/${workspaceID}/copilot`。租户固定（内嵌平台）。 */
export function workspacePrefix(): string {
  return `/${encodeURIComponent(CURRENT_TENANT_ID)}/copilot`;
}

/** 会话 API 前缀：`/${workspaceID}/copilot/conversations`（每次调用时按当前租户动态取值） */
function convPrefix(): string {
  return `${workspacePrefix()}/conversations`;
}

/** Authorization 请求头（有平台 token 时）；供裸 fetch（SSE/审批/停止）复用 */
export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** 合并 Authorization 头（已有则不覆盖） */
function withAuth(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const t = getToken();
  if (t && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${t}`);
  return { ...init, headers };
}

/** 统一请求：注入 Authorization，解析 JSON，非 ok 时抛出后端 error 信息。
 *  HTTP 401 时清空 token、用默认凭据重登一次后重试原请求（仅一次）；仍 401 再抛错。 */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(apiUrl(path), withAuth(init));
  const text = await resp.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  // token 失效：重登一次后重试原请求（不递归，login 失败直接抛出，避免无限重试）
  if (resp.status === 401) {
    setToken('');
    await login();
    const retryResp = await fetch(apiUrl(path), withAuth(init));
    const retryText = await retryResp.text();
    let retryBody: unknown = null;
    if (retryText) {
      try {
        retryBody = JSON.parse(retryText);
      } catch {
        retryBody = retryText;
      }
    }
    if (!retryResp.ok) {
      const msg =
        (retryBody as { error?: string } | null)?.error ||
        (typeof retryBody === 'string' && retryBody) ||
        `HTTP ${retryResp.status}`;
      throw new Error(msg);
    }
    return retryBody as T;
  }

  if (!resp.ok) {
    const msg =
      (body as { error?: string } | null)?.error ||
      (typeof body === 'string' && body) ||
      `HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return body as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** 1. 会话列表（按 updated_at DESC） */
export function listConversations(limit = 50, offset = 0): Promise<ConversationListResp> {
  return req<ConversationListResp>(
    `${convPrefix()}?limit=${limit}&offset=${offset}`,
  );
}

/** 2. 新建会话（201）。userID / tenantID 由后端从 session 取，请求体仅 title */
export function createConversation(title: string): Promise<Conversation> {
  return req<Conversation>(convPrefix(), jsonInit('POST', { title }));
}

/** 3. 取单个会话（200 / 404） */
export function getConversation(id: string): Promise<Conversation> {
  return req<Conversation>(`${convPrefix()}/${encodeURIComponent(id)}`);
}

/** 4. 重命名会话（200 返回更新后会话） */
export function renameConversation(id: string, title: string): Promise<Conversation> {
  return req<Conversation>(
    `${convPrefix()}/${encodeURIComponent(id)}`,
    jsonInit('PATCH', { title }),
  );
}

/** 5. 删除会话（200 {"deleted":true}） */
export function deleteConversation(id: string): Promise<{ deleted: boolean }> {
  return req<{ deleted: boolean }>(`${convPrefix()}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** 6. 会话消息列表（按 seq ASC，blocks 可为 null） */
export function listMessages(conversationId: string): Promise<MessageListResp> {
  return req<MessageListResp>(`${convPrefix()}/${encodeURIComponent(conversationId)}/messages`);
}

/** 7. 追加一条消息（201，含 seq） */
export function appendMessage(
  conversationId: string,
  body: AppendMessageBody,
): Promise<HistoryMessage> {
  return req<HistoryMessage>(
    `${convPrefix()}/${encodeURIComponent(conversationId)}/messages`,
    jsonInit('POST', body),
  );
}

// ============================================================
// 任务 API：approve / cancel 为即发即忘（fire-and-forget）。
// POST /task 创建与 GET /task/{id}/stream 订阅因需 AbortSignal + 原始流，
// 由 useTask 直接 fetch（与原实现一致），这里只封装无需特殊处理的两个端点。
// ============================================================

/** POST /{workspaceID}/copilot/task/approve：{task_id, approved}。即发即忘。 */
export function approveTask(taskId: string, approved: boolean): Promise<Response> {
  return fetch(apiUrl(`${workspacePrefix()}/task/approve`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ task_id: taskId, approved }),
  });
}

/** DELETE /{workspaceID}/copilot/task/{id}：取消任务。即发即忘。 */
export function cancelTask(taskId: string): Promise<Response> {
  return fetch(apiUrl(`${workspacePrefix()}/task/${encodeURIComponent(taskId)}`), {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
}
