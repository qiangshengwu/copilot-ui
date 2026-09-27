import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Modal } from 'antd';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useModel, useRequest } from '@umijs/max';
import { copilotClient } from '@/services/clients';
import type { Block, ChatMessage, ConversationListResp, HistoryMessage, MessageListResp } from '@/types';
import type { ChatState } from './useChatState';

interface Options {
  chat: ChatState;
  /** running 镜像 ref：会话操作在任务运行中被禁用 */
  runningRef: MutableRefObject<boolean>;
}

/** 把服务端历史消息映射为渲染消息（blocks 原样恢复） */
function toRenderMessages(list: HistoryMessage[]): ChatMessage[] {
  return (list || []).map((h) => ({
    id: h.id,
    role: h.role === 'user' ? 'user' : 'assistant',
    content: h.content || '',
    blocks: (h.blocks as Block[]) || [],
  }));
}

/**
 * 会话列表 + CRUD。统一使用 copilotClient()（openapi-fetch）+ @umijs/max 的 useRequest：
 * - 列表：useRequest 自动请求，refresh 刷新
 * - create / rename / delete：useRequest(manual)，onSuccess 刷新列表
 * - openConversation：函数式调用（await client）
 * 租户 id 取自 getInitialState → initialState.tenant.id（内嵌平台默认租户）。
 */
export function useConversations({ chat, runningRef }: Options) {
  const { initialState } = useModel('@@initialState');
  const tenantId = initialState?.tenant?.id as string;

  const [activeConvId, setActiveConvIdState] = useState('');
  const activeConvIdRef = useRef('');
  activeConvIdRef.current = activeConvId;

  const [openLoading, setOpenLoading] = useState(false);
  const [booted, setBooted] = useState(false);

  // ---------- 列表查询（无限滚动：触底加载下一页） ----------
  const PAGE_SIZE = 50;
  const listInf = useInfiniteQuery({
    queryKey: ['copilot-conversations', tenantId],
    queryFn: ({ pageParam }) =>
      copilotClient()
        .get('/{workspaceID}/copilot/conversations', {
          params: { query: { limit: PAGE_SIZE, offset: pageParam }, path: { workspaceID: tenantId } },
        })
        .then((r) => r.data as unknown as ConversationListResp),
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
  const openConversation = useCallback(
    async (id: string) => {
      setOpenLoading(true);
      try {
        const page = await copilotClient().get('/{workspaceID}/copilot/conversations/{id}/messages', {
          params: { path: { workspaceID: tenantId, id } },
        });
        const resp = page.data as unknown as MessageListResp;
        chat.setMessages(toRenderMessages(resp?.messages || []));
        setActiveConvIdState(id);
        chat.setAutoApprove(false);
      } catch (e) {
        console.warn('[copilot] open conversation failed:', e);
      } finally {
        setOpenLoading(false);
      }
    },
    [chat, tenantId],
  );

  // 引导：列表首次到达后，自动打开第一条会话
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    if (!listInf.data) return;
    bootRef.current = true;
    setBooted(true);
    const convs = listInf.data?.pages?.[0]?.conversations || [];
    if (convs.length > 0) void openConversation(convs[0].id);
  }, [listInf.data, openConversation]);

  // ---------- mutations（onSuccess 刷新列表） ----------
  const createReq = useRequest(
    (title: string) =>
      copilotClient().post('/{workspaceID}/copilot/conversations', {
        params: { path: { workspaceID: tenantId } },
        body: { title },
      }),
    { manual: true, onSuccess: () => refresh() },
  );

  const renameReq = useRequest(
    ({ id, title }: { id: string; title: string }) =>
      copilotClient().patch('/{workspaceID}/copilot/conversations/{id}', {
        params: { path: { workspaceID: tenantId, id } },
        body: { title },
      }),
    { manual: true, onSuccess: () => refresh() },
  );

  const deleteReq = useRequest(
    (id: string) =>
      copilotClient().del('/{workspaceID}/copilot/conversations/{id}', {
        params: { path: { workspaceID: tenantId, id } },
      }),
    {
      manual: true,
      onSuccess: (_data: unknown, params: unknown[]) => {
        const id = params?.[0] as string;
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
    Modal.confirm({
      title: '删除当前会话？',
      content: '将删除该会话及其全部消息（服务端持久化，不可恢复）。',
      okText: '删除',
      cancelText: '取消',
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

  const convLoading = openLoading || (!booted && listLoading);

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
    createConversation: (title: string) => createReq.run(title),
  };
}

export type ConversationsState = ReturnType<typeof useConversations>;
