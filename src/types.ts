// ============================================================
// SSE 事件与消息渲染模型类型定义
// 契约来源：agent/server/panel.html（Go 服务内嵌面板）
// ============================================================

/** step.data.type 子类型 */
export type StepType =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'final'
  | 'approval'
  | 'a2ui';

/** step / approval 事件的 data 载荷（字段较杂，宽松定义） */
export interface StepData {
  type?: StepType;
  /** thinking / final 的流式文本 */
  content?: string;
  /** tool_call / tool_result 的工具名 */
  tool_name?: string;
  /** 顶层 approval 事件里的工具名 */
  tool?: string;
  /** tool_call 风险等级 */
  risk?: 'read' | 'modify' | 'danger' | string;
  /** tool_call / approval 的入参 */
  params?: unknown;
  /** approval(step) 的审批结果 */
  approved?: boolean;
  /** 图表标题（chart.title 透传） */
  title?: string;
  [k: string]: unknown;
}

// ---------------- A2UI（动态卡片）命令协议 ----------------
// 后端 SSE step 事件 data.type==='a2ui' 时，data.content 为 JSON 数组字符串，
// 元素为以下四种命令之一。前端解析后用 @ant-design/x-card 的 XCard.Box 渲染。

/** A2UI 组件类型（节点 type 字段） */
export type A2UIComponentType = 'Text' | 'Table' | 'Chart' | 'Statistic';

/** createSurface：声明一个 surface */
export interface A2UICreateSurfaceCmd {
  type: 'createSurface';
  surface: { id: string; title?: string };
}

/** updateComponents 命令中的单个节点（nodeId -> 节点定义） */
export interface A2UIComponentNode {
  type: string;
  props: Record<string, unknown>;
}

/** updateComponents：向 surface 写入组件树（map：nodeId -> 节点） */
export interface A2UIUpdateComponentsCmd {
  type: 'updateComponents';
  surfaceId: string;
  components: Record<string, A2UIComponentNode>;
}

/** updateDataModel：写入 surface 的数据模型（路径绑定用） */
export interface A2UIUpdateDataModelCmd {
  type: 'updateDataModel';
  surfaceId: string;
  path: string;
  value: unknown;
}

/** deleteSurface：销毁 surface（单条消息通常用不到，兜底实现） */
export interface A2UIDeleteSurfaceCmd {
  type: 'deleteSurface';
  surfaceId: string;
}

/** A2UI 命令联合（SSE content JSON.parse 后的元素） */
export type A2UICommand =
  | A2UICreateSurfaceCmd
  | A2UIUpdateComponentsCmd
  | A2UIUpdateDataModelCmd
  | A2UIDeleteSurfaceCmd;

/** 一条 SSE 事件（data: 前缀后的 JSON 反序列化结果） */
export interface SSEEvent {
  /** task_created / task_started / step / done / failed / cancelled / approval */
  type: string;
  task_id?: string;
  data?: StepData;
  /** failed 事件的错误信息 */
  error?: string;
  [k: string]: unknown;
}

/** 租户 */
export interface Tenant {
  id: string;
  name: string;
  alias?: string;
}

/** 发送任务请求体 */
export interface TaskRequestBody {
  prompt: string;
  user_id: string;
  tenant_id?: string;
  stream: boolean;
  history: { role: string; content: string }[];
}

/** POST /{workspaceID}/copilot/task 响应（仅需 id 用于订阅流） */
export interface TaskCreatedResp {
  id: string;
}

/** POST /task 请求体（user_id/tenant_id 由后端从 session 取，前端不传） */
export interface CreateTaskBody {
  prompt: string;
  history: { role: string; content: string }[];
}

// ---------------- 渲染侧模型 ----------------

export type BlockKind =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'chart'
  | 'approval_pending'
  | 'approval_result'
  | 'a2ui'
  | 'error';

export interface Block {
  id: string;
  kind: BlockKind;
  /** thinking 流式文本 */
  thinkingText?: string;
  thinkingDone?: boolean;
  /** tool_call */
  toolName?: string;
  risk?: string;
  params?: unknown;
  toolStatus?: 'running' | 'done' | 'failed';
  /** tool_result */
  resultContent?: string;
  /** chart（始终可见，不随过程开关隐藏） */
  chartTitle?: string;
  chartOption?: Record<string, unknown>;
  chartFailed?: boolean;
  /** approval_pending / approval_result */
  approved?: boolean;
  /** error */
  errorText?: string;
  /** a2ui：解析后的命令数组（用于 XCard.Box 渲染） */
  a2uiCommands?: A2UICommand[];
  /** a2ui：原始 JSON 字符串（渲染失败兜底展示） */
  a2uiRaw?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** 用户原文 / 助手最终回答（markdown 文本） */
  content: string;
  /** 流式输出中的助手回答（打字机） */
  streamingContent?: string;
  streaming?: boolean;
  /** 过程块（不持久化到 localStorage） */
  blocks: Block[];
  /** phase 状态徽标文案 */
  phase?: string;
  phaseBusy?: boolean;
  /** 是否有连接中断提示 */
  disconnected?: boolean;
}

// ---------------- 历史对话（服务端 postgres，契约冻结） ----------------

/** 一个会话：GET /{workspaceID}/conversations 列表项 / POST / PATCH 响应 */
export interface Conversation {
  id: string;
  user_id: string;
  tenant_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/** GET 会话列表响应（按 updated_at DESC） */
export interface ConversationListResp {
  conversations: Conversation[];
  total: number;
}

/** 一条落库消息：GET .../messages 列表项 / POST 响应（会话内按 seq ASC） */
export interface HistoryMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 过程块原始 JSONB，前端不消费（可为 null） */
  blocks?: unknown;
  /** 会话内单调递增序号（服务端事务内分配） */
  seq: number;
  created_at: string;
}

/** GET 消息列表响应（按 seq ASC） */
export interface MessageListResp {
  messages: HistoryMessage[];
  total: number;
}

/** POST .../messages 请求体 */
export interface AppendMessageBody {
  role: 'user' | 'assistant';
  content: string;
  blocks?: unknown;
}
