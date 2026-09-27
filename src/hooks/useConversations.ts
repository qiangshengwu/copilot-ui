import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Modal } from 'antd';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { Block, ChatMessage, ConversationListResp, HistoryMessage } from '@/types';
import {
  listConversations,
  listMessages,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  renameConversation as apiRenameConversation,
} from '@/utils/api';
import type { ChatState } from './useChatState';

interface Options {
  chat: ChatState;
  /** running 镜像 ref：会话操作在任务运行中被禁用（与原 double-booking 一致） */
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
 * 会话列表（useQuery）+ CRUD（useMutation，成功后 invalidate）。
 * 租户固定（内嵌平台），queryKey 不再携带 tenantId。
 * openConversation 仍为函数式加载（带 convLoading），行为与原实现一致。
 */
export function useConversations({ chat, runningRef }: Options) {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvIdState] = useState('');
  const activeConvIdRef = useRef('');
  activeConvIdRef.current = activeConvId;

  const [openLoading, setOpenLoading] = useState(false);
  const [booted, setBooted] = useState(false);

  // ---------- 列表查询 ----------
  const listQ = useQuery<ConversationListResp>({
    queryKey: ['conversations'],
    queryFn: () => listConversations(50, 0),
    placeholderData: keepPreviousData,
  });
  const conversations = listQ.data?.conversations ?? [];

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [queryClient]);

  // ---------- 打开会话 ----------
  const openConversation = useCallback(
    async (id: string) => {
      setOpenLoading(true);
      try {
        const page = await listMessages(id);
        chat.setMessages(toRenderMessages(page.messages || []));
        setActiveConvIdState(id);
        chat.setAutoApprove(false);
      } catch (e) {
        console.warn('[copilot] open conversation failed:', e);
      } finally {
        setOpenLoading(false);
      }
    },
    [chat],
  );

  // 引导：列表首次到达后，自动打开第一条会话（与原 boot 一致）
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    if (!listQ.data) return;
    bootRef.current = true;
    setBooted(true);
    const convs = listQ.data.conversations || [];
    if (convs.length > 0) void openConversation(convs[0].id);
  }, [listQ.data, openConversation]);

  // ---------- mutations ----------
  const createMut = useMutation({
    mutationFn: (title: string) => apiCreateConversation(title),
    onSuccess: () => invalidateConversations(),
  });

  const renameMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => apiRenameConversation(id, title),
    onSuccess: () => invalidateConversations(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDeleteConversation(id),
    onSuccess: (_data, id) => {
      invalidateConversations();
      if (activeConvIdRef.current === id) {
        setActiveConvIdState('');
        chat.resetMessages();
      }
    },
  });

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
        await deleteMut.mutateAsync(id);
      } catch (e) {
        console.warn('[copilot] delete conversation failed:', e);
      }
    },
    [deleteMut, runningRef],
  );

  const rename = useCallback(
    async (id: string, title: string) => {
      if (runningRef.current) return;
      try {
        await renameMut.mutateAsync({ id, title });
      } catch (e) {
        console.warn('[copilot] rename conversation failed:', e);
      }
    },
    [renameMut, runningRef],
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
          await deleteMut.mutateAsync(id);
        } catch (e) {
          console.warn('[copilot] delete current conversation failed:', e);
        }
        setActiveConvIdState('');
        chat.resetMessages();
        chat.setAutoApprove(false);
      },
    });
  }, [chat, deleteMut]);

  /** 发送流程中创建会话后，同步激活 */
  const setActiveConvId = useCallback((id: string) => setActiveConvIdState(id), []);

  const convLoading = openLoading || (!booted && listQ.isFetching);

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
    invalidateConversations,
    createConversation: (title: string) => createMut.mutateAsync(title),
  };
}

export type ConversationsState = ReturnType<typeof useConversations>;
