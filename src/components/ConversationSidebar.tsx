import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Listy, Popconfirm, Spin, Tooltip, theme } from 'antd';
import {
  Building2,
  Check,
  MessageSquare,
  MessageSquareDashed,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useModel } from '@umijs/max';
import type { Conversation } from '@/types';
import { useIntl } from '@umijs/max';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  running: boolean;
  loading?: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void> | void;
}

function formatTime(iso: string, intl: ReturnType<typeof useIntl>): string {
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
    if (diffMin < 60) return intl.formatMessage({ id: 'copilot.time.min.ago' }, { n: diffMin });
    return intl.formatMessage({ id: 'copilot.time.hour.ago' }, { n: Math.round(diffMin / 60) });
  }
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  if (t.getFullYear() === now.getFullYear()) return `${mm}-${dd}`;
  return `${t.getFullYear()}-${mm}-${dd}`;
}

const SENTINEL = { __loadMoreSentinel: true as const };

export default function ConversationSidebar({
  conversations,
  activeId,
  running,
  loading,
  loadMore,
  hasMore,
  loadingMore,
  onNew,
  onSelect,
  onDelete,
  onRename,
}: ConversationSidebarProps) {
  const { token } = theme.useToken();
  const intl = useIntl();
  const fm = (id: string) => intl.formatMessage({ id });
  const { initialState } = useModel('@@initialState') as {
    initialState?: { tenant?: { name?: string; id?: string } };
  };

  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const listBoxRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => (c.title || '').toLowerCase().includes(q));
  }, [conversations, query]);

  useEffect(() => {
    const el = listBoxRef.current;
    if (!el) return;
    const update = () => setListHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, query, filtered.length]);

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

  const handleScroll: React.UIEventHandler<HTMLElement> = (e) => {
    if (query) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 90) {
      if (hasMore && !loadingMore && loadMore) loadMore();
    }
  };

  const listItems: Array<Conversation | typeof SENTINEL> = !query && hasMore
    ? [...filtered, SENTINEL]
    : filtered;

  const renderItem = (item: Conversation | typeof SENTINEL) => {
    if ('__loadMoreSentinel' in item) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0', color: token.colorTextSecondary }}>
          {loadingMore ? <Spin size="small" /> : <span style={{ fontSize: 11 }}>{fm('copilot.conversation.load.more')}</span>}
        </div>
      );
    }
    const c = item as Conversation;
    const active = c.id === activeId;
    const editing = editingId === c.id;
    return (
      <div
        role="button"
        tabIndex={running ? -1 : 0}
        aria-current={active ? 'true' : undefined}
        aria-label={c.title || fm('copilot.conversation.untitled')}
        onClick={() => {
          if (!running && !editing) onSelect(c.id);
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !running && !editing) {
            e.preventDefault();
            onSelect(c.id);
          }
        }}
        title={c.title}
        className={`cp-conv-item${active ? ' is-active' : ''}`}
        style={{ opacity: running && !active ? 0.55 : 1 }}
      >
        <div className="cp-conv-icon">
          <MessageSquare size={14} />
        </div>
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
              style={{ fontSize: 12.5, padding: '2px 7px', height: 27 }}
            />
          ) : (
            <>
              <div className="cp-conv-title">{c.title || fm('copilot.conversation.untitled')}</div>
              <div className="cp-conv-time">{formatTime(c.updated_at, intl)}</div>
            </>
          )}
        </div>

        <div className="cp-conv-actions">
          {editing ? (
            <>
              <button
                type="button"
                className="cp-icon-btn"
                style={{ width: 24, height: 24 }}
                aria-label={fm('copilot.conversation.rename.confirm')}
                onClick={(e) => {
                  e.stopPropagation();
                  void commitEdit(c.id);
                }}
              >
                <Check size={13} color={token.colorPrimary} />
              </button>
              <button
                type="button"
                className="cp-icon-btn"
                style={{ width: 24, height: 24 }}
                aria-label={fm('copilot.common.cancel')}
                onClick={(e) => {
                  e.stopPropagation();
                  cancelEdit();
                }}
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <Tooltip title={running ? fm('copilot.common.running.rename') : fm('copilot.conversation.rename')}>
                <button
                  type="button"
                  className="cp-icon-btn"
                  style={{ width: 24, height: 24 }}
                  disabled={running}
                  aria-label={fm('copilot.conversation.rename')}
                  onClick={(e) => startEdit(c, e)}
                >
                  <Pencil size={12.5} />
                </button>
              </Tooltip>
              <Popconfirm
                title={fm('copilot.conversation.delete.title')}
                description={fm('copilot.conversation.delete.desc')}
                okText={fm('copilot.common.delete')}
                cancelText={fm('copilot.common.cancel')}
                okButtonProps={{ danger: true }}
                disabled={running}
                onConfirm={(e) => {
                  e?.stopPropagation();
                  onDelete(c.id);
                }}
              >
                <Tooltip title={running ? fm('copilot.common.running.delete') : fm('copilot.conversation.delete')}>
                  <button
                    type="button"
                    className="cp-icon-btn"
                    style={{ width: 24, height: 24 }}
                    disabled={running}
                    aria-label={fm('copilot.conversation.delete')}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 size={12.5} />
                  </button>
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </div>
      </div>
    );
  };

  const tenantName = initialState?.tenant?.name || fm('copilot.sidebar.tenant');
  const tenantInitial = (tenantName || 'T').trim().charAt(0).toUpperCase();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div className="cp-sidebar-head">
        <div className="cp-brand">
          <div className="cp-brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3l1.9 5.6L19 10.5l-5.1 1.9L12 18l-1.9-5.6L5 10.5l5.1-1.9L12 3Z" fill="currentColor" opacity=".92" />
              <circle cx="18.5" cy="5" r="1.6" fill="currentColor" opacity=".65" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="cp-brand-name">
              Copilot <span className="cp-brand-tag">Agent</span>
            </div>
            <div className="cp-brand-sub">{fm('copilot.app.console')}</div>
          </div>
        </div>

        <Button
          type="primary"
          block
          className="cp-new-chat"
          icon={<Plus size={16} />}
          disabled={running}
          onClick={onNew}
        >
          {fm('copilot.conversation.new')}
        </Button>

        <Input
          className="cp-search"
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={fm('copilot.sidebar.search')}
          prefix={<Search size={14} style={{ color: token.colorTextTertiary }} />}
        />
      </div>

      <div className="cp-sidebar-section">
        <span>{fm('copilot.history.title')}</span>
        {conversations.length > 0 && <span>{conversations.length}</span>}
      </div>

      <div className="cp-sidebar-list">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 50,
                  borderRadius: 11,
                  background: `linear-gradient(90deg, ${token.colorFillTertiary} 25%, ${token.colorFill} 37%, ${token.colorFillTertiary} 63%)`,
                  backgroundSize: '400% 100%',
                  animation: 'cpShimmer 1.4s ease infinite',
                  opacity: 1 - i * 0.15,
                }}
              />
            ))}
            <style>{`@keyframes cpShimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cp-sidebar-empty">
            <MessageSquareDashed size={28} />
            <div>{query ? fm('copilot.sidebar.noResult') : fm('copilot.history.empty')}</div>
          </div>
        ) : (
          <div ref={listBoxRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Listy
              items={listItems as Conversation[]}
              rowKey={(item) => ('__loadMoreSentinel' in item ? '__load-more' : (item as Conversation).id)}
              height={listHeight || 320}
              virtual
              itemRender={renderItem}
              onScroll={handleScroll}
              style={{ overflowX: 'hidden' }}
            />
          </div>
        )}
      </div>

      <div className="cp-sidebar-foot">
        <div className="cp-tenant" title={tenantName}>
          <div className="cp-tenant-mark">{tenantInitial}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="cp-tenant-name">{tenantName}</div>
            <div className="cp-tenant-sub">
              <Building2 size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />
              {fm('copilot.sidebar.tenantSub')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
