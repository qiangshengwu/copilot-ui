// 聊天渲染态的纯工具函数（原 index.tsx 内联辅助）。
// 不依赖 React，便于多 hook 复用与单测。

export interface PendingTool {
  name: string;
  blockId: string;
}

let blockSeq = 0;
/** 过程块 id：b_<时间戳>_<自增序列> */
export const newBlockId = (): string => `b_${Date.now()}_${blockSeq++}`;

let msgSeq = 0;
/** 渲染消息 id：m_<时间戳>_<自增序列> */
export const newMsgId = (): string => `m_${Date.now()}_${msgSeq++}`;

/** 标题取首条文本前 30 字符，超长截断加省略号 */
export const truncateTitle = (t: string): string => {
  const s = t.trim().replace(/\s+/g, ' ');
  if (!s) return '新对话';
  return s.length > 30 ? `${s.slice(0, 30)}…` : s;
};

/** 等待一帧，让 React flush setState 后再读最新 state */
export const tick = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0));
