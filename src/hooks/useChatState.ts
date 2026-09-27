import { useCallback, useEffect, useRef, useState } from 'react';
import type { Block, ChatMessage } from '@/types';
import type { PendingTool } from './chatUtils';

/**
 * 聊天渲染态：messages/blocks 的增改、当前助手消息定位、msgRef 快照，
 * 以及 final 事件高频更新的 requestAnimationFrame 节流合并。
 *
 * 设计要点：
 * - curMsgIdRef 指向"当前正在流式输出的助手消息"，updateCur/appendBlock/patchBlock 都按它定位；
 * - msgRef.current 每次渲染同步为最新 messages，供异步回调（终态落库 / 拼 history）读快照；
 * - final 事件每 chunk 携带完整累积文本，直接 setState 会整篇重渲染 markdown。
 *   这里把待 flush 文本暂存，每帧合并成一次 setState，长回答不再逐 chunk 卡顿。
 */
export function useChatState() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [autoApprove, setAutoApproveState] = useState(false);

  const curMsgIdRef = useRef<string | null>(null);
  const msgRef = useRef<ChatMessage[]>([]);
  msgRef.current = messages;
  const pendingToolRef = useRef<PendingTool[]>([]);
  const finishedRef = useRef(false);
  const finalAnswerRef = useRef('');

  // ---------- final 事件 rAF 节流 ----------
  const rafRef = useRef<number | null>(null);
  const pendingFinalRef = useRef('');

  const cancelFinalRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // 卸载时取消挂起的帧，避免对已卸载组件 setState
  useEffect(() => cancelFinalRaf, [cancelFinalRaf]);

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

  const resetMessages = useCallback(() => setMessages([]), []);

  const appendMessages = useCallback(
    (list: ChatMessage[]) => setMessages((prev) => [...prev, ...list]),
    [],
  );

  const setAutoApprove = useCallback((v: boolean) => setAutoApproveState(v), []);

  /**
   * 收到 final chunk：记录为待 flush，调度一帧后统一写 streamingContent。
   * 一帧内多个 chunk 只触发一次 setState。
   */
  const scheduleFinal = useCallback(
    (text: string) => {
      pendingFinalRef.current = text;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const txt = pendingFinalRef.current;
        if (!txt) return;
        finalAnswerRef.current = txt;
        updateCur((m) => ({
          ...m,
          phase: '正在生成回答…',
          phaseBusy: true,
          streaming: true,
          streamingContent: txt,
        }));
      });
    },
    [updateCur],
  );

  /** 终态前同步刷出最后一帧，保证 done 时 streamingContent 已含最新文本。 */
  const flushFinalSync = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const txt = pendingFinalRef.current;
    if (!txt) return;
    pendingFinalRef.current = '';
    finalAnswerRef.current = txt;
    updateCur((m) => ({ ...m, streaming: true, streamingContent: txt }));
  }, [updateCur]);

  return {
    messages,
    setMessages,
    msgRef,
    curMsgIdRef,
    pendingToolRef,
    finishedRef,
    finalAnswerRef,
    autoApprove,
    setAutoApprove,
    updateCur,
    appendBlock,
    patchBlock,
    resetMessages,
    appendMessages,
    scheduleFinal,
    flushFinalSync,
    cancelFinalRaf,
  };
}

export type ChatState = ReturnType<typeof useChatState>;
