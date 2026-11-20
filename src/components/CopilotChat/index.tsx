import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { App as AntdApp, ConfigProvider, Drawer } from 'antd';
import { XProvider } from '@ant-design/x';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { ArrowDown } from 'lucide-react';
import { useChatState } from './hooks/useChatState';
import { useConversations } from './hooks/useConversations';
import { useTask } from './hooks/useTask';
import ConversationSidebar from './components/ConversationSidebar';
import HeaderBar from './components/HeaderBar';
import MessageItem from './components/MessageItem';
import Welcome from './components/Welcome';
import Composer from './components/Composer';
import {
  CopilotProvider,
  translate,
  useCopilot,
  type CopilotLocale,
  type CopilotRuntime,
} from './context';
import { createCopilotClient } from './request';
import { useCopilotStyles } from './styles';

export interface CopilotChatProps {
  /** 平台租户/工作空间 ID，必填。 */
  tenantId: string;
  /** 侧栏底部展示的租户名称。 */
  tenantName?: string;
  /** 可选：宿主统一的 fetch 拦截器；默认使用全局 fetch。 */
  fetch?: typeof fetch;
  /** API 前缀，例如 https://host/api；默认同源。 */
  baseUrl?: string;
  locale?: CopilotLocale;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** 可传入宿主已有的 QueryClient。 */
  queryClient?: QueryClient;
  /** 初始打开的会话。 */
  initialConversationId?: string;
  onConversationChange?: (id: string) => void;
}

export default function CopilotChat({
  tenantId,
  tenantName,
  fetch: fetchImpl,
  baseUrl = '',
  locale = 'zh-CN',
  height = '100%',
  className,
  style,
  title,
  queryClient,
  initialConversationId,
  onConversationChange,
}: CopilotChatProps) {
  const normalizedBaseUrl = (baseUrl || '').replace(/\/+$/, '');
  const resolvedFetch = useMemo(
    () => fetchImpl ?? globalThis.fetch.bind(globalThis),
    [fetchImpl],
  );
  const client = useMemo(
    () => createCopilotClient(normalizedBaseUrl, resolvedFetch),
    [normalizedBaseUrl, resolvedFetch],
  );
  const t = useMemo(
    () => (id: string, vars?: Record<string, string | number>) => translate(locale, id, vars),
    [locale],
  );

  const runtime = useMemo<CopilotRuntime>(
    () => ({
      tenantId,
      tenantName,
      baseUrl: normalizedBaseUrl,
      locale,
      t,
      isZh: locale === 'zh-CN',
      client,
      fetch: resolvedFetch,
    }),
    [client, locale, normalizedBaseUrl, resolvedFetch, t, tenantId, tenantName],
  );

  const qc = useMemo(
    () => queryClient ?? new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
    }),
    [queryClient],
  );

  if (!tenantId) {
    return (
      <div style={{ padding: 24, color: 'inherit' }}>
        CopilotChat: tenantId is required
      </div>
    );
  }

  const antdLocale = locale === 'zh-CN' ? zhCN : enUS;

  return (
    <ConfigProvider locale={antdLocale}>
      <AntdApp component={false}>
        <XProvider locale={antdLocale}>
          <QueryClientProvider client={qc}>
            <CopilotProvider value={runtime}>
              <ChatShell
                title={title}
                height={height}
                className={className}
                style={style}
                initialConversationId={initialConversationId}
                onConversationChange={onConversationChange}
              />
            </CopilotProvider>
          </QueryClientProvider>
        </XProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

interface ChatShellProps {
  title?: string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  initialConversationId?: string;
  onConversationChange?: (id: string) => void;
}

function ChatShell({
  title,
  height,
  className,
  style,
  initialConversationId,
  onConversationChange,
}: ChatShellProps) {
  const appCss = useCopilotStyles();
  const chat = useChatState();
  const runningRef = useRef(false);

  const convs = useConversations({ chat, runningRef, initialConversationId });
  const task = useTask({ chat, convs });

  useEffect(() => {
    runningRef.current = task.running;
  }, [task.running]);

  const [showProcess, setShowProcess] = useState(true);
  const [autoFollow, setAutoFollow] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showWelcome = !convs.activeConvId && chat.messages.length === 0;

  useEffect(() => {
    if (convs.activeConvId) onConversationChange?.(convs.activeConvId);
  }, [convs.activeConvId, onConversationChange]);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (showWelcome) {
      scrollRef.current.scrollTop = 0;
      return;
    }
    if (autoFollow) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.messages, autoFollow, showWelcome]);

  useEffect(() => {
    const el = scrollRef.current;
    const content = el?.firstElementChild as HTMLElement | null;
    if (!el || !content) return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      if (!autoFollow || showWelcome) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
    ro.observe(content);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [autoFollow, showWelcome]);

  const lastScrollTopRef = useRef(0);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    const movedUp = el.scrollTop < lastScrollTopRef.current - 2;
    lastScrollTopRef.current = el.scrollTop;
    if (movedUp) setAutoFollow(false);
    else if (nearBottom) setAutoFollow(true);
  };

  const scrollToBottom = () => {
    setAutoFollow(true);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const activeConversation = convs.conversations.find((c) => c.id === convs.activeConvId);
  const runtime = useCopilot();
  const headerTitle = activeConversation?.title || title || runtime.t('copilot.app.console');

  const sidebar = (
    <ConversationSidebar
      conversations={convs.conversations}
      activeId={convs.activeConvId || null}
      running={task.running}
      loading={convs.convLoading}
      loadMore={convs.loadMore}
      hasMore={convs.hasMore}
      loadingMore={convs.loadingMore}
      onNew={() => {
        setMobileOpen(false);
        convs.newConversation();
      }}
      onSelect={(id) => {
        setMobileOpen(false);
        convs.selectConversation(id);
      }}
      onDelete={convs.deleteSidebar}
      onRename={convs.rename}
    />
  );

  return (
    <div
      className={`${appCss}${className ? ` ${className}` : ''}`}
      style={{ height, ...style }}
    >
      <div className="copilot-shell">
        <aside className="copilot-sidebar">{sidebar}</aside>

        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          placement="left"
          size={300}
          closable={false}
          rootClassName={appCss}
          styles={{ body: { padding: 0, background: 'var(--cp-surface)' } }}
        >
          {mobileOpen ? sidebar : null}
        </Drawer>

        <main className="copilot-main">
          <HeaderBar
            title={headerTitle}
            running={task.running}
            showProcess={showProcess}
            onShowProcessChange={setShowProcess}
            autoFollow={autoFollow}
            onToggleFollow={scrollToBottom}
            onClear={convs.deleteCurrent}
            autoApprove={chat.autoApprove}
            onDisableAutoApprove={() => chat.setAutoApprove(false)}
            onOpenSidebar={() => setMobileOpen(true)}
          />

          <div ref={scrollRef} onScroll={onScroll} className="copilot-scroll" role="log" aria-live="polite">
            <div className="copilot-column">
              {showWelcome ? (
                <Welcome onPick={task.send} />
              ) : (
                chat.messages.map((m) => (
                  <MessageItem
                    key={m.id}
                    msg={m}
                    showProcess={showProcess}
                    onApprove={task.handleApprove}
                    onApproveAndTrust={task.handleApproveAndTrust}
                  />
                ))
              )}
            </div>
          </div>

          {!autoFollow && chat.messages.length > 0 && (
            <button type="button" className="cp-scroll-bottom" onClick={scrollToBottom}>
              <ArrowDown size={13} />
              {runtime.t('copilot.msg.scroll.bottom')}
            </button>
          )}

          <div className="copilot-composer-wrap">
            <div className="copilot-composer-inner">
              <Composer running={task.running} onSend={task.send} onStop={task.stop} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
