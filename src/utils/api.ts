// API 基址与请求辅助。
// base 留空 = 同源（dev 下走 umi proxy，prod 下由后端同域托管）；
// 非空则所有 API 前缀到该地址。记忆在 localStorage。

import type {
  AppendMessageBody,
  Conversation,
  ConversationListResp,
  HistoryMessage,
  MessageListResp,
} from '@/types';
import { getToken, getCurrentTenantId } from './platform';

const BASE_KEY = 'copilot-base';

export function getBase(): string {
  try {
    const b = (localStorage.getItem(BASE_KEY) || '').trim();
    return b.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function setBase(b: string) {
  try {
    if (b) localStorage.setItem(BASE_KEY, b.trim());
    else localStorage.removeItem(BASE_KEY);
  } catch {
    /* ignore */
  }
}

/** 拼接完整 API 地址；base 为空时返回相对路径（同源） */
export function apiUrl(path: string): string {
  const b = getBase();
  if (!b) return path;
  return b + path;
}

// ============================================================
// 历史对话 API（服务端 postgres，契约冻结）
// 后端 decodeBody 用 DisallowUnknownFields，请求体字段名必须与契约完全一致。
// 错误统一格式：{"error":"..."}
// ============================================================

/** 当前 Web 面板用户的固定标识（与 /task 的 user_id 对齐） */
export const WEB_USER_ID = 'web-panel';

// ============================================================
// 新路由契约：agent 路由改为 /{workspaceID}/...
//   workspaceID = 当前选中租户 id（路径段即唯一租户来源，后端忽略 body/query 的 tenant_id）
// 会话：/{workspaceID}/conversations[/:id][/messages]
// 任务：/{workspaceID}/task[/approve|/:id]
// ============================================================

/** 当前 workspaceID 路径前缀：`/${workspaceID}` */
export function workspacePrefix(): string {
  return `/${encodeURIComponent(getCurrentTenantId())}`;
}

/** 会话 API 前缀：`/${workspaceID}/conversations`（每次调用时按当前租户动态取值） */
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

/** 统一请求：注入 Authorization，解析 JSON，非 ok 时抛出后端 error 信息 */
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
    `${convPrefix()}?user_id=${encodeURIComponent(WEB_USER_ID)}&limit=${limit}&offset=${offset}`,
  );
}

/** 2. 新建会话（201）。tenant_id 仍传一致值（后端忽略，兼容） */
export function createConversation(title: string, tenantId: string): Promise<Conversation> {
  return req<Conversation>(
    convPrefix(),
    jsonInit('POST', { user_id: WEB_USER_ID, tenant_id: tenantId || '', title }),
  );
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
