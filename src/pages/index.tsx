import { useEffect, useRef, useState, useCallback } from 'react';
import { theme as antdTheme, Modal } from 'antd';
import { XProvider } from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import type { ChatMessage, Block, SSEEvent, Tenant, Conversation } from '@/types';
import {
  apiUrl,
  getBase,
  setBase,
  listConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  listMessages,
  appendMessage,
  workspacePrefix,
  authHeaders,
} from '@/utils/api';
import {
  fetchTenants,
  getCurrentTenantId,
  setCurrentTenantId,
} from '@/utils/platform';
import { XStream } from '@ant-design/x-sdk';
import HeaderBar from '@/components/HeaderBar';
import MessageItem from '@/components/MessageItem';
import Welcome from '@/components/Welcome';
import Composer from '@/components/Composer';
import ConversationSidebar from '@/components/ConversationSidebar';
import '@/global.less';

const THEME_KEY = 'copilot-theme';

let blockSeq = 0;
const newBlockId = () => `b_${Date.now()}_${blockSeq++}`;
let msgSeq = 0;
const newMsgId = () => `m_${Date.now()}_${msgSeq++}`;

interface PendingTool {
  name: string;
  blockId: string;
}

/** 标题取首条文本前 30 字符，超长截断加省略号 */
const truncateTitle = (t: string): string => {
  const s = t.trim().replace(/\s+/g, ' ');
  if (!s) return '新对话';
  return s.length > 30 ? `${s.slice(0, 30)}…` : s;
};

/** 等待一帧，让 React flush setState 后再读最新 state */
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export default function HomePage() {
  // ---------- 状态 ----------
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [showProcess, setShowProcess] = useState(true);
  const [autoFollow, setAutoFollow] = useState(true);
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) return saved === 'dark';
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [base, setBaseState] = useState(() => getBase());
  const [autoApprove, setAutoApprove] = useState(false);

  // 历史会话（服务端 postgres）
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState('');
  const [convLoading, setConvLoading] = useState(false);

  // ---------- refs ----------
  const taskIdRef = useRef<string | null>(null);
  const curMsgIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingToolRef = useRef<PendingTool[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const finalAnswerRef = useRef('');
  // 最新 messages 快照（供终态落库 / 构建 history，避免闭包过期）
  const msgRef = useRef<ChatMessage[]>([]);
  msgRef.current = messages;
  // 当前会话 ID 快照（供 SSE 回调落库助手消息）
  const activeConvIdRef = useRef<string>('');
  activeConvIdRef.current = activeConvId;

  // ---------- 工具：更新当前助手消息 ----------
  const updateCur = useCallback((fn: (m: ChatMessage) => ChatMessage) => {
    const id = curMsgIdRef.current;
    if (!id) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const appendBlock = useCallback(
    (block: Block) => {
      updateCur((m) => ({ ...m, blocks: [...m.blocks, block] }));
    },
    [updateCur],
  );

  const patchBlock = useCallback(
    (blockId: string, patch: Partial<Block>) => {
      updateCur((m) => ({
        ...m,
        blocks: m.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
      }));
    },
    [updateCur],
  );

  // ---------- 主题持久化 ----------
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  // ---------- 引导：登录平台 → 拉租户 → 选当前租户 → 加载历史会话 ----------
  // 新路由把 workspaceID（=租户 id）放进路径段，必须先选定租户才能调 agent API。
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    (async () => {
      let list: Tenant[] = [];
      try {
        list = await fetchTenants();
      } catch (e) {
        console.warn('[copilot] fetch tenants failed:', e);
      }
      setTenants(list);
      // 选当前租户：优先 localStorage 中仍存在的，否则取第一个
      const stored = getCurrentTenantId();
      const picked = list.find((t) => t.id === stored)?.id || list[0]?.id || '';
      setCurrentTenantId(picked);
      setTenantId(picked);
      // 租户就绪后再加载会话列表（否则路径段为空）
      setConvLoading(true);
      try {
        const page = await listConversations(50, 0);
        const convs = page.conversations || [];
        setConversations(convs);
        if (convs.length > 0) await openConversation(convs[0].id);
      } catch (e) {
        console.warn('[copilot] load conversations failed:', e);
      } finally {
        setConvLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 自动滚动 ----------
  useEffect(() => {
    if (autoFollow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoFollow]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoFollow(nearBottom);
  };

  // ---------- 历史会话：刷新列表 ----------
  const refreshConversations = useCallback(async () => {
    try {
      const page = await listConversations(50, 0);
      setConversations(page.conversations || []);
    } catch {
      /* 静默 */
    }
  }, []);

  // 打开一个会话：从服务端读取消息重建渲染（含过程块原样恢复）
  const openConversation = useCallback(async (id: string) => {
    setConvLoading(true);
    try {
      const page = await listMessages(id);
      const restored: ChatMessage[] = (page.messages || []).map((h) => ({
        id: h.id,
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content || '',
        blocks: (h.blocks as Block[]) || [],
      }));
      setMessages(restored);
      setActiveConvId(id);
      setAutoApprove(false);
    } catch (e) {
      console.warn('[copilot] open conversation failed:', e);
    } finally {
      setConvLoading(false);
    }
  }, []);

  // 新建会话（仅本地重置；服务端会话在首次发送时创建）
  const newConversation = useCallback(() => {
    if (running) return;
    setActiveConvId('');
    setMessages([]);
    setAutoApprove(false);
  }, [running]);

  // 侧栏：切换会话
  const handleSelectConv = useCallback(
    (id: string) => {
      if (running) return; // 侧栏已禁用，双保险
      void openConversation(id);
    },
    [running, openConversation],
  );

  // 侧栏：删除会话
  const handleDeleteConv = useCallback(
    async (id: string) => {
      if (running) return;
      try {
        await deleteConversation(id);
      } catch (e) {
        console.warn('[copilot] delete conversation failed:', e);
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvIdRef.current === id) {
        setActiveConvId('');
        setMessages([]);
      }
    },
    [running],
  );

  // 侧栏：重命名会话
  const handleRenameConv = useCallback(
    async (id: string, title: string) => {
      if (running) return;
      try {
        const updated = await renameConversation(id, title);
        setConversations((prev) => {
          const next = prev.map((c) => (c.id === id ? { ...c, ...updated } : c));
          // 服务端 PATCH 会刷新 updated_at，按 updated_at DESC 重排与列表契约一致
          next.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
          return next;
        });
      } catch (e) {
        console.warn('[copilot] rename conversation failed:', e);
      }
    },
    [running],
  );

  // ---------- 审批 ----------
  const doApprove = useCallback((ok: boolean) => {
    const tid = taskIdRef.current;
    if (!tid) return;
    fetch(apiUrl(`${workspacePrefix()}/task/approve`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ task_id: tid, approved: ok }),
    }).catch(() => {});
  }, []);

  const handleApprove = useCallback(
    (ok: boolean) => {
      doApprove(ok);
      // 移除待审批块
      updateCur((m) => ({
        ...m,
        blocks: m.blocks.map((b) =>
          b.kind === 'approval_pending' ? { ...b, kind: 'approval_result', approved: ok } : b,
        ),
        phase: undefined,
        phaseBusy: false,
      }));
    },
    [doApprove, updateCur],
  );

  const handleApproveAndTrust = useCallback(() => {
    Modal.confirm({
      title: '开启本对话一键批准？',
      content:
        '开启后，本对话内所有后续写操作 / 删除操作将被自动批准并立即执行，可能造成不可恢复的数据变更。是否确认开启？',
      okText: '确认开启',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setAutoApprove(true);
        doApprove(true);
        updateCur((m) => ({
          ...m,
          blocks: m.blocks.map((b) =>
            b.kind === 'approval_pending'
              ? { ...b, kind: 'approval_result', approved: true }
              : b,
          ),
          phase: undefined,
          phaseBusy: false,
        }));
      },
    });
  }, [doApprove, updateCur]);

  // ---------- 终态：把 assistant 消息（content + 完整过程块）落库 ----------
  const persistAssistant = useCallback(
    async (convId: string, asstId: string) => {
      if (!convId) return;
      await tick(); // 等待 React flush 最新 messages
      const m = msgRef.current.find((x) => x.id === asstId);
      if (!m) return;
      const content = m.content || m.streamingContent || '';
      const blocks = m.blocks && m.blocks.length ? m.blocks : null;
      try {
        await appendMessage(convId, { role: 'assistant', content, blocks });
      } catch (e) {
        console.warn('[copilot] persist assistant failed:', e);
      }
      void refreshConversations();
    },
    [refreshConversations],
  );

  // ---------- SSE 事件处理 ----------
  const handleEvent = useCallback(
    (ev: SSEEvent): boolean => {
      const t = ev.type;
      const d = ev.data || {};

      if (t === 'task_created') {
        taskIdRef.current = ev.task_id || null;
        return false;
      }
      if (t === 'task_started') {
        updateCur((m) => ({ ...m, phase: '正在分析任务…', phaseBusy: true }));
        return false;
      }
      if (t === 'step') {
        const st = d.type;
        if (st === 'thinking') {
          // 若最后一块是未完成的 thinking，则流式追加；否则新建
          setMessages((prev) => {
            const id = curMsgIdRef.current;
            return prev.map((m) => {
              if (m.id !== id) return m;
              const blocks = [...m.blocks];
              const last = blocks[blocks.length - 1];
              if (last && last.kind === 'thinking' && !last.thinkingDone) {
                blocks[blocks.length - 1] = {
                  ...last,
                  thinkingText: (last.thinkingText || '') + (d.content || ''),
                };
              } else {
                blocks.push({
                  id: newBlockId(),
                  kind: 'thinking',
                  thinkingText: d.content || '',
                  thinkingDone: false,
                });
              }
              return { ...m, blocks };
            });
          });
          updateCur((m) => ({ ...m, phase: '正在推理…', phaseBusy: true }));
          return false;
        }
        if (st === 'tool_call') {
          // 收尾前一个 thinking
          updateCur((m) => ({
            ...m,
            blocks: m.blocks.map((b) =>
              b.kind === 'thinking' && !b.thinkingDone ? { ...b, thinkingDone: true } : b,
            ),
          }));
          const blockId = newBlockId();
          pendingToolRef.current.push({ name: d.tool_name || '', blockId });
          appendBlock({
            id: blockId,
            kind: 'tool_call',
            toolName: d.tool_name,
            risk: d.risk || 'read',
            params: d.params,
            toolStatus: 'running',
          });
          updateCur((m) => ({ ...m, phase: `正在调用工具 · ${d.tool_name || ''}`, phaseBusy: true }));
          return false;
        }
        if (st === 'tool_result') {
          const name = d.tool_name || '';
          const content = String(d.content || '');
          // 收尾 thinking
          updateCur((m) => ({
            ...m,
            blocks: m.blocks.map((b) =>
              b.kind === 'thinking' && !b.thinkingDone ? { ...b, thinkingDone: true } : b,
            ),
          }));
          // 标记对应 tool_call 完成/失败
          const failed = content.startsWith('工具执行失败');
          const idx = pendingToolRef.current.findIndex((p) => p.name === name);
          if (idx >= 0) {
            const pt = pendingToolRef.current[idx];
            patchBlock(pt.blockId, { toolStatus: failed ? 'failed' : 'done' });
            pendingToolRef.current.splice(idx, 1);
          }
          // 抽图表独立块（始终可见）
          let chartTitle: string | undefined;
          let chartOption: Record<string, unknown> | undefined;
          try {
            const obj = JSON.parse(content);
            if (obj && obj.chart && typeof obj.chart.option === 'object' && obj.chart.option) {
              chartTitle = obj.chart.title || '数据图表';
              chartOption = obj.chart.option;
            }
          } catch {
            /* ignore */
          }
          if (chartOption) {
            appendBlock({ id: newBlockId(), kind: 'chart', chartTitle, chartOption });
          }
          // 原始结果块（随过程开关隐藏）
          appendBlock({
            id: newBlockId(),
            kind: 'tool_result',
            toolName: name,
            resultContent: content,
          });
          updateCur((m) => ({ ...m, phase: '正在整理结果…', phaseBusy: true }));
          return false;
        }
        if (st === 'final') {
          finalAnswerRef.current = d.content || finalAnswerRef.current;
          updateCur((m) => ({ ...m, phase: '正在生成回答…', phaseBusy: true, streaming: true, streamingContent: finalAnswerRef.current }));
          return false;
        }
        if (st === 'approval') {
          appendBlock({
            id: newBlockId(),
            kind: 'approval_result',
            approved: !!d.approved,
          });
          return false;
        }
        return false;
      }
      if (t === 'approval') {
        const d2 = d;
        if (autoApprove) {
          doApprove(true);
          appendBlock({
            id: newBlockId(),
            kind: 'approval_result',
            approved: true,
          });
          return false;
        }
        appendBlock({
          id: newBlockId(),
          kind: 'approval_pending',
          toolName: d2.tool,
          params: d2.params,
        });
        updateCur((m) => ({ ...m, phase: '等待审批…', phaseBusy: true }));
        return false;
      }
      if (t === 'done') {
        updateCur((m) => ({
          ...m,
          phase: undefined,
          phaseBusy: false,
          streaming: false,
          content: m.streamingContent || m.content,
          streamingContent: undefined,
          blocks: m.blocks.map((b) =>
            b.kind === 'thinking' ? { ...b, thinkingDone: true } : b,
          ),
        }));
        finishedRef.current = true;
        return true;
      }
      if (t === 'failed') {
        appendBlock({ id: newBlockId(), kind: 'error', errorText: ev.error || (d.error as string) || '未知错误' });
        updateCur((m) => ({ ...m, phase: undefined, phaseBusy: false, streaming: false }));
        finishedRef.current = true;
        return true;
      }
      if (t === 'cancelled') {
        updateCur((m) => ({ ...m, phase: undefined, phaseBusy: false, streaming: false }));
        finishedRef.current = true;
        return true;
      }
      return false;
    },
    [appendBlock, patchBlock, updateCur, doApprove, autoApprove],
  );

  // ---------- 完成收尾 ----------
  const finish = useCallback(() => {
    setRunning(false);
    taskIdRef.current = null;
    curMsgIdRef.current = null;
    pendingToolRef.current = [];
    abortRef.current = null;
    finalAnswerRef.current = '';
  }, []);

  // ---------- 发送 ----------
  const send = useCallback(
    async (text: string) => {
      const prompt = (text || '').trim();
      if (!prompt) return;
      if (running) return;
      if (!getCurrentTenantId()) {
        Modal.error({ title: '未选择租户', content: '请先在右上角选择一个租户后再发送。' });
        return;
      }

      let convId = activeConvIdRef.current;
      // 无活动会话则先创建（title 取文本前 30 字符）
      if (!convId) {
        try {
          const conv = await createConversation(truncateTitle(prompt));
          convId = conv.id;
          setActiveConvId(convId);
          setConversations((prev) => [conv, ...prev]);
        } catch (e) {
          Modal.error({
            title: '创建会话失败',
            content: `无法创建历史会话：${(e as Error).message}`,
          });
          return;
        }
      }
      const convIdStr = convId as string;

      // user 消息落库（失败不阻塞任务，但已尽力入列）
      try {
        await appendMessage(convIdStr, { role: 'user', content: prompt, blocks: null });
      } catch (e) {
        console.warn('[copilot] persist user message failed:', e);
      }

      const userMsg: ChatMessage = { id: newMsgId(), role: 'user', content: prompt, blocks: [] };
      const asstMsg: ChatMessage = {
        id: newMsgId(),
        role: 'assistant',
        content: '',
        blocks: [],
        phase: '正在发送…',
        phaseBusy: true,
      };
      setMessages((prev) => [...prev, userMsg, asstMsg]);
      curMsgIdRef.current = asstMsg.id;
      finishedRef.current = false;
      finalAnswerRef.current = '';
      setRunning(true);

      abortRef.current = new AbortController();
      // history：当前会话已加载消息的 role/content 对，slice(-20)
      const history = msgRef.current
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && !!m.content)
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));
      // tenant/user 由后端从 authn.Session 取，前端不再传 user_id/tenant_id/stream。
      const body = {
        prompt,
        history,
      };

      try {
        // 1. 创建任务（标准 POST，返回 task 含 id）
        const createResp = await fetch(apiUrl(`${workspacePrefix()}/task`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });
        if (!createResp.ok) {
          const e = await createResp.text();
          appendBlock({ id: newBlockId(), kind: 'error', errorText: `HTTP ${createResp.status} ${e}` });
          await persistAssistant(convIdStr, asstMsg.id);
          finish();
          return;
        }
        const created = await createResp.json();
        taskIdRef.current = created.id;

        // 2. 订阅 SSE 流式端点（订阅后后端启动任务，事件不丢）
        const streamResp = await fetch(
          apiUrl(`${workspacePrefix()}/task/${encodeURIComponent(created.id)}/stream`),
          {
            headers: { ...authHeaders() },
            signal: abortRef.current.signal,
          },
        );
        if (!streamResp.ok || !streamResp.body) {
          const e = streamResp.ok ? '响应无 body' : await streamResp.text();
          appendBlock({ id: newBlockId(), kind: 'error', errorText: `HTTP ${streamResp.status} ${e}` });
          await persistAssistant(convIdStr, asstMsg.id);
          finish();
          return;
        }
        const stream = XStream({ readableStream: streamResp.body });
        for await (const frame of stream) {
          let ev: SSEEvent;
          try {
            ev = JSON.parse(frame.data);
          } catch {
            continue;
          }
          if (handleEvent(ev)) break;
        }
        await persistAssistant(convIdStr, asstMsg.id);
        finish();
        if (!finishedRef.current) {
          updateCur((m) => ({ ...m, disconnected: true, phase: undefined, phaseBusy: false, streaming: false }));
        }
      } catch (err) {
        const e = err as Error;
        if (e.name !== 'AbortError') {
          appendBlock({ id: newBlockId(), kind: 'error', errorText: e.message || '请求失败' });
        }
        await persistAssistant(convIdStr, asstMsg.id);
        finish();
      }
    },
    [running, tenantId, handleEvent, appendBlock, updateCur, finish, persistAssistant],
  );

  // ---------- 停止 ----------
  const stop = useCallback(() => {
    const tid = taskIdRef.current;
    if (tid) {
      fetch(apiUrl(`${workspacePrefix()}/task/${encodeURIComponent(tid)}`), {
        method: 'DELETE',
        headers: { ...authHeaders() },
      }).catch(() => {});
    }
    abortRef.current?.abort();
    finish();
  }, [finish]);

  // ---------- 顶栏：删除当前会话（原"清空会话"） ----------
  const deleteCurrent = useCallback(() => {
    const id = activeConvIdRef.current;
    if (!id) return;
    Modal.confirm({
      title: '删除当前会话？',
      content: '将删除该会话及其全部消息（服务端持久化，不可恢复）。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteConversation(id);
        } catch (e) {
          console.warn('[copilot] delete current conversation failed:', e);
        }
        setConversations((prev) => prev.filter((c) => c.id !== id));
        setActiveConvId('');
        setMessages([]);
        setAutoApprove(false);
      },
    });
  }, []);

  const onBaseChange = useCallback((v: string) => {
    setBaseState(v);
    setBase(v);
  }, []);

  // 切换租户：同步模块级 currentTenantId（workspaceID），并重置/重载会话
  const handleTenantChange = useCallback(
    (v: string) => {
      setCurrentTenantId(v);
      setTenantId(v);
      if (running) return;
      setActiveConvId('');
      setMessages([]);
      void refreshConversations();
    },
    [running, refreshConversations],
  );

  // 欢迎态：无活动会话且无消息时展示（以会话存在性为准）
  const showWelcome = !activeConvId && messages.length === 0;
  const muted = dark ? '#9ca3af' : '#6b7280';

  return (
    <XProvider
      locale={zhCN}
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#10a37f', borderRadius: 8 },
      }}
    >
      <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConvId || null}
          running={running}
          dark={dark}
          loading={convLoading}
          onNew={newConversation}
          onSelect={handleSelectConv}
          onDelete={handleDeleteConv}
          onRename={handleRenameConv}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <HeaderBar
            tenants={tenants}
            tenantId={tenantId}
            onTenantChange={handleTenantChange}
            base={base}
            onBaseChange={onBaseChange}
            showProcess={showProcess}
            onShowProcessChange={setShowProcess}
            autoFollow={autoFollow}
            onToggleFollow={() => {
              setAutoFollow(true);
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }}
            onClear={deleteCurrent}
            dark={dark}
            onToggleTheme={() => setDark((v) => !v)}
            autoApprove={autoApprove}
            onDisableAutoApprove={() => setAutoApprove(false)}
          />

          <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto' }}>
            <div
              style={{
                maxWidth: 900,
                margin: '0 auto',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                minHeight: '100%',
              }}
            >
              {showWelcome ? (
                <Welcome onPick={(text) => send(text)} />
              ) : (
                messages.map((m) => (
                  <MessageItem
                    key={m.id}
                    msg={m}
                    showProcess={showProcess}
                    onApprove={handleApprove}
                    onApproveAndTrust={handleApproveAndTrust}
                  />
                ))
              )}
            </div>
          </div>

          <Composer running={running} onSend={send} onStop={stop} />
        </div>
      </div>
    </XProvider>
  );
}
