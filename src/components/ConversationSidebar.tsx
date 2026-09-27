import { useState } from 'react';
import { Button, Input, Popconfirm, Tooltip } from 'antd';
import { Plus, Trash2, MessageSquare, Pencil, Check, X } from 'lucide-react';
import type { Conversation } from '@/types';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { useToken } from '@ant-design/pro-components';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  running: boolean;
  loading?: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void> | void;
}

/** 相对/绝对时间：今天显示 x分钟前/小时前，今年显示 MM-DD，跨年显示 YYYY-MM-DD */
function formatTime(iso: string): string {
  if (!iso) return '';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const now = new Date();
  const sameDay =
    t.getFullYear() === now.getFullYear() &&
    t.getMonth() === now.getMonth() &&
    t.getDate() === now.getDate();
  if (sameDay) {
    const diffMin = Math.max(1, Math.round((now.getTime() - t.getTime()) / 60000));
    if (diffMin < 60) return `${diffMin}分钟前`;
    return `${Math.round(diffMin / 60)}小时前`;
  }
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  if (t.getFullYear() === now.getFullYear()) return `${mm}-${dd}`;
  return `${t.getFullYear()}-${mm}-${dd}`;
}

export default function ConversationSidebar({
  conversations,
  activeId,
  running,
  loading,
  onNew,
  onSelect,
  onDelete,
  onRename,
}: ConversationSidebarProps) {
  const { token } = useToken();

  // 会话列表项：hover 底色 + active 品牌色左竖条（替代全局 .conv-item）
  const convItem = useEmotionCss(({ token }) => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: token.borderRadius,
    cursor: 'pointer',
    transition: 'background 150ms ease, color 150ms ease',
    '&:hover': { background: token.colorFillSecondary },
  }));
  const convItemActive = useEmotionCss(({ token }) => ({
    background: token.colorPrimaryBg,
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 3,
      height: '58%',
      borderRadius: 999,
      background: token.colorPrimary,
    },
  }));

  const iconBtn = useEmotionCss(({ token }) => ({
    flexShrink: 0,
    padding: 4,
    borderRadius: token.borderRadiusSM,
    color: token.colorTextSecondary,
    opacity: 0.7,
    cursor: 'pointer',
    transition: 'background 150ms ease, color 150ms ease',
    '&:hover': { background: token.colorFillSecondary },
  }));

  // 会话列表加载占位：脉动骨架（含 keyframes，组件内提供）
  const skLine = useEmotionCss(({ token }) => ({
    height: 34,
    borderRadius: token.borderRadius,
    background: `linear-gradient(90deg, ${token.colorFillTertiary} 25%, ${token.colorFill} 37%, ${token.colorFillTertiary} 63%)`,
    backgroundSize: '400% 100%',
    animation: 'copilotSkPulse 1.4s ease infinite',
    '@keyframes copilotSkPulse': {
      '0%': { backgroundPosition: '100% 50%' },
      '100%': { backgroundPosition: '0 50%' },
    },
  }));

  // 内联重命名状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (running) return;
    setEditingId(c.id);
    setEditValue(c.title || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const commitEdit = async (id: string) => {
    const v = editValue.trim();
    if (v) {
      try {
        await onRename(id, v);
      } catch (err) {
        console.warn('[copilot] rename failed:', err);
      }
    }
    cancelEdit();
  };

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${token.colorSplit}`,
        background: token.colorBgContainer,
      }}
    >
      <div style={{ padding: 12, borderBottom: `1px solid ${token.colorSplit}` }}>
        <Button type="primary" block icon={<Plus size={15} />} disabled={running} onClick={onNew}>
          新建会话
        </Button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.4,
            color: token.colorTextSecondary,
            padding: '4px 10px 6px',
            textTransform: 'uppercase',
          }}
        >
          历史会话
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
            <div className={skLine} />
            <div className={skLine} style={{ opacity: 0.7 }} />
            <div className={skLine} style={{ opacity: 0.5 }} />
          </div>
        ) : conversations.length === 0 ? (
          <div
            style={{ padding: 16, textAlign: 'center', fontSize: 12, color: token.colorTextSecondary }}
          >
            暂无历史会话
          </div>
        ) : (
          conversations.map((c) => {
            const active = c.id === activeId;
            const editing = editingId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  if (!running && !editing) onSelect(c.id);
                }}
                title={c.title}
                className={active ? `${convItem} ${convItemActive}` : convItem}
                style={{
                  cursor: running ? 'not-allowed' : 'pointer',
                  opacity: running && !active ? 0.6 : 1,
                }}
              >
                <MessageSquare
                  size={14}
                  style={{ flexShrink: 0, color: active ? token.colorPrimary : token.colorTextSecondary }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editing ? (
                    <Input
                      size="small"
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onPressEnter={() => commitEdit(c.id)}
                      onBlur={() => commitEdit(c.id)}
                      style={{ fontSize: 13, padding: '0 6px', height: 26 }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        color: token.colorText,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {c.title || '未命名会话'}
                    </div>
                  )}
                  {!editing && (
                    <div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>
                      {formatTime(c.updated_at)}
                    </div>
                  )}
                </div>

                {editing ? (
                  <>
                    <Tooltip title="确认重命名">
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          void commitEdit(c.id);
                        }}
                        style={{ flexShrink: 0, padding: 4, color: token.colorPrimary, cursor: 'pointer' }}
                      >
                        <Check size={13} />
                      </span>
                    </Tooltip>
                    <Tooltip title="取消">
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                        style={{ flexShrink: 0, padding: 4, color: token.colorTextSecondary, cursor: 'pointer' }}
                      >
                        <X size={13} />
                      </span>
                    </Tooltip>
                  </>
                ) : (
                  <>
                    <Tooltip title={running ? '任务运行中，暂不可重命名' : '重命名会话'}>
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => startEdit(c, e)}
                        className={iconBtn}
                        style={{ cursor: running ? 'not-allowed' : 'pointer' }}
                      >
                        <Pencil size={13} />
                      </span>
                    </Tooltip>
                    <Popconfirm
                      title="删除该会话？"
                      description="会话及其全部消息将被删除，不可恢复。"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      disabled={running}
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        onDelete(c.id);
                      }}
                    >
                      <Tooltip title={running ? '任务运行中，暂不可删除' : '删除会话'}>
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => e.stopPropagation()}
                          className={iconBtn}
                          style={{ cursor: running ? 'not-allowed' : 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </span>
                      </Tooltip>
                    </Popconfirm>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
