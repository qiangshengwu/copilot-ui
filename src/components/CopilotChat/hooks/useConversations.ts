import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { App as AntdApp } from 'antd';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCopilot } from '@/components/CopilotChat/context';
import { useRequestLite } from './useRequestLite';
import type { Block, ChatMessage, ConversationListResp, HistoryMessage, MessageListResp } from '@/types';
import type { ChatState } from './useChatState';

interface Options {
  chat: ChatState;
  /** running 镜像 ref：会话操作在任务运行中被禁用 */
  runningRef: MutableRefObject<boolean>;
  /** 组件挂载时优先打开的会话 */
  initialConversationId?: string;
}

/** 把服务端历史消息映射为渲染消息（blocks 原样恢复） */
function toRenderMessages(list: HistoryMessage[]): ChatMessage[] {
  return (list || []).map((h) => ({
    id: h.id,
    role: h.role === 'user' ? 'user' : 'assistant',
    content: h.content || '',
    blocks: Array.isArray(h.blocks) ? (h.blocks as Block[]) : [],
  }));
}

/**
 * 会话列表 + CRUD。统一使用 client（openapi-fetch）+ 组件内 useRequestLite：
 * - 列表：useInfiniteQuery 拉取，refresh 刷新
 * - create / rename / delete：useRequestLite，onSuccess 刷新列表
 * - openConversation：函数式调用（await client）
 * 租户 id 取自 getInitialState → initialState.tenant.id（内嵌平台默认租户）。
 */
export function useConversations({ chat, runningRef, initialConversationId }: Options) {
  const { tenantId, client, locale } = useCopilot();
  const { modal } = AntdApp.useApp();
  const T = (zh: string, en: string) => (locale === 'zh-CN' ? zh : en);

  const [activeConvId, setActiveConvIdState] = useState('');
  const activeConvIdRef = useRef('');
  activeConvIdRef.current = activeConvId;

  const [openLoading, setOpenLoading] = useState(false);
  const [booted, setBooted] = useState(false);

  // ---------- 列表查询（无限滚动：触底加载下一页） ----------
  const PAGE_SIZE = 50;
  const listInf = useInfiniteQuery({
    queryKey: ['copilot-conversations', tenantId],
    enabled: !!tenantId,
    queryFn: ({ pageParam }) =>
      client
        .get('/{workspaceID}/copilot/conversations', {
          params: { query: { limit: PAGE_SIZE, offset: pageParam }, path: { workspaceID: tenantId } },
        })
        .then((r: any) => r.data as unknown as ConversationListResp),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const lastLen = lastPage?.conversations?.length ?? 0;
      if (lastLen < PAGE_SIZE) return undefined; // 不足一页 = 没有更多
      return allPages.reduce((n, p) => n + (p?.conversations?.length ?? 0), 0);
    },
  });
  // 累加所有已加载页
  const conversations = listInf.data?.pages.flatMap((p) => p?.conversations ?? []) ?? [];
  const listLoading = listInf.isLoading;
  const refresh = listInf.refetch;
  const loadMore = listInf.fetchNextPage;
  const hasMore = listInf.hasNextPage;
  const loadingMore = listInf.isFetchingNextPage;

  // ---------- 打开会话 ----------
  // 用递增序号丢弃过期响应：A→B 快速切换时，A 的慢响应不能覆盖 B。
  const openSeqRef = useRef(0);
  const openConversation = useCallback(
    async (id: string) => {
      if (!tenantId) return;
      const seq = ++openSeqRef.current;
      setOpenLoading(true);
      try {
        const page = await client.get('/{workspaceID}/copilot/conversations/{id}/messages', {
          params: { path: { workspaceID: tenantId, id } },
        });
        if (seq !== openSeqRef.current) return;
        const resp = page.data as unknown as MessageListResp;
        chat.setMessages(toRenderMessages(resp?.messages || []));
        setActiveConvIdState(id);
        chat.setAutoApprove(false);
        chat.finishedRef.current = false;
        chat.pendingToolRef.current = [];
      } catch (e) {
        if (seq === openSeqRef.current) {
          console.warn('[copilot] open conversation failed:', e);
        }
      } finally {
        if (seq === openSeqRef.current) setOpenLoading(false);
      }
    },
    [chat, tenantId],
  );

  // 引导：列表首次到达后，自动打开第一条会话
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    if (!listInf.data || !tenantId) return;
    bootRef.current = true;
    setBooted(true);
    if (initialConversationId) {
      void openConversation(initialConversationId);
      return;
    }
    // 用户已经开始新对话/正在运行时，不要用列表第一条覆盖当前界面
    if (runningRef.current || activeConvIdRef.current || chat.messages.length > 0) return;
    const convs = listInf.data?.pages?.[0]?.conversations || [];
    if (convs.length > 0) void openConversation(convs[0].id);
  }, [listInf.data, openConversation, tenantId, chat.messages.length, runningRef, initialConversationId]);

  // ---------- mutations（onSuccess 刷新列表） ----------
  const createReq = useRequestLite(
    async (title: string) =>
      client.post('/{workspaceID}/copilot/conversations', {
        params: { path: { workspaceID: tenantId } },
        body: { title },
      }),
    { onSuccess: () => refresh() },
  );

  const renameReq = useRequestLite(
    async ({ id, title }: { id: string; title: string }) =>
      client.patch('/{workspaceID}/copilot/conversations/{id}', {
        params: { path: { workspaceID: tenantId, id } },
        body: { title },
      }),
    { onSuccess: () => refresh() },
  );

  const deleteReq = useRequestLite(
    async (id: string) =>
      client.del('/{workspaceID}/copilot/conversations/{id}', {
        params: { path: { workspaceID: tenantId, id } },
      }),
    {
      onSuccess: (_data, args) => {
        const id = args?.[0] as string;
        refresh();
        if (activeConvIdRef.current === id) {
          setActiveConvIdState('');
          chat.resetMessages();
        }
      },
    },
  );

  // ---------- 暴露给侧栏/顶栏的动作 ----------
  /** 新建会话：仅本地重置；服务端会话在首次发送时创建 */
  const newConversation = useCallback(() => {
    if (runningRef.current) return;
    setActiveConvIdState('');
    chat.resetMessages();
    chat.setAutoApprove(false);
  }, [chat, runningRef]);

  const selectConversation = useCallback(
    (id: string) => {
      if (runningRef.current) return;
      void openConversation(id);
    },
    [openConversation, runningRef],
  );

  const deleteSidebar = useCallback(
    async (id: string) => {
      if (runningRef.current) return;
      try {
        await deleteReq.run(id);
      } catch (e) {
        console.warn('[copilot] delete conversation failed:', e);
      }
    },
    [deleteReq, runningRef],
  );

  const rename = useCallback(
    async (id: string, title: string) => {
      if (runningRef.current) return;
      try {
        await renameReq.run({ id, title });
      } catch (e) {
        console.warn('[copilot] rename conversation failed:', e);
      }
    },
    [renameReq, runningRef],
  );

  /** 顶栏"删除当前会话"（带 Modal 确认） */
  const deleteCurrent = useCallback(() => {
    const id = activeConvIdRef.current;
    if (!id) return;
    modal.confirm({
      title: T('删除当前会话？', 'Delete current conversation?'),
      content: T('将删除该会话及其全部消息（服务端持久化，不可恢复）。', 'The conversation and all its messages will be deleted (persisted server-side, irreversible).'),
      okText: T('删除', 'Delete'),
      cancelText: T('取消', 'Cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteReq.run(id);
        } catch (e) {
          console.warn('[copilot] delete current conversation failed:', e);
        }
        setActiveConvIdState('');
        chat.resetMessages();
        chat.setAutoApprove(false);
      },
    });
  }, [chat, deleteReq]);

  /** 发送流程中创建会话后，同步激活 */
  const setActiveConvId = useCallback((id: string) => setActiveConvIdState(id), []);

  const convLoading = openLoading || (!booted && listLoading && !!tenantId);

  return {
    conversations,
    activeConvId,
    activeConvIdRef,
    convLoading,
    openConversation,
    newConversation,
    selectConversation,
    deleteSidebar,
    rename,
    deleteCurrent,
    setActiveConvId,
    refresh,
    loadMore,
    hasMore,
    loadingMore,
    createConversation: async (title: string) => {
      if (!tenantId) throw new Error(T('租户未就绪', 'Tenant not ready'));
      // openapi-fetch 返回 { data, error }，业务体在 data（含 id）；取 data 供调用方直接用 conv.id
      const res = (await createReq.run(title)) as { data?: { id: string } };
      if (!res?.data?.id) throw new Error(T('创建会话失败', 'Failed to create conversation'));
      return res.data;
    },
  };
}

export type ConversationsState = ReturnType<typeof useConversations>;
