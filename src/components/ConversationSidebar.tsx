import { useState } from 'react';
import { Button, Input, Popconfirm, Tooltip } from 'antd';
import { Plus, Trash2, MessageSquare, Pencil, Check, X } from 'lucide-react';
import type { Conversation } from '@/types';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  running: boolean;
  dark: boolean;
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
  dark,
  loading,
  onNew,
  onSelect,
  onDelete,
  onRename,
}: ConversationSidebarProps) {
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const itemBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const activeBg = 'rgba(16,185,129,0.16)';
  const muted = dark ? '#9ca3af' : '#6b7280';

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
        borderRight: `1px solid ${borderColor}`,
        background: dark ? 'rgba(24,24,24,0.6)' : 'rgba(248,249,251,0.9)',
      }}
    >
      <div style={{ padding: 12, borderBottom: `1px solid ${borderColor}` }}>
        <Button
          type="primary"
          block
          icon={<Plus size={15} />}
          disabled={running}
          onClick={onNew}
          style={{ background: running ? undefined : '#10a37f' }}
        >
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
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: muted }}>
            加载会话…
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: muted }}>
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: running ? 'not-allowed' : 'pointer',
                  background: active ? activeBg : 'transparent',
                  opacity: running && !active ? 0.6 : 1,
                }}
              >
                <MessageSquare size={14} style={{ flexShrink: 0, color: active ? '#10a37f' : muted }} />
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
                        color: dark ? '#e5e7eb' : '#1f2937',
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
                    <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
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
                        style={{ flexShrink: 0, padding: 4, color: '#10a37f', cursor: 'pointer' }}
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
                        style={{ flexShrink: 0, padding: 4, color: muted, cursor: 'pointer' }}
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
                        style={{
                          flexShrink: 0,
                          padding: 4,
                          borderRadius: 6,
                          color: muted,
                          opacity: 0.7,
                          cursor: running ? 'not-allowed' : 'pointer',
                        }}
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
                          style={{
                            flexShrink: 0,
                            padding: 4,
                            borderRadius: 6,
                            color: muted,
                            opacity: 0.7,
                            cursor: running ? 'not-allowed' : 'pointer',
                          }}
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
