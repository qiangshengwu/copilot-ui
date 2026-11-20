import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider, Drawer, theme } from 'antd';
import { XProvider } from '@ant-design/x';
import { ArrowDown } from 'lucide-react';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { getLocale, useIntl } from '@umijs/max';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { useChatState } from '@/hooks/useChatState';
import { useConversations } from '@/hooks/useConversations';
import { useTask } from '@/hooks/useTask';
import ConversationSidebar from '@/components/ConversationSidebar';
import HeaderBar from '@/components/HeaderBar';
import MessageItem from '@/components/MessageItem';
import Welcome from '@/components/Welcome';
import Composer from '@/components/Composer';
import LoginGate from '@/components/LoginGate';
import { applyTheme, buildTheme, getInitialTheme, type ThemeMode } from '@/theme';
import { copilotStyles } from '@/styles/copilotStyles';

export default function HomePage() {
  const chat = useChatState();
  const intl = useIntl();
  const fm = (id: string) => intl.formatMessage({ id });

  const runningRef = useRef(false);

  const convs = useConversations({ chat, runningRef });

  const task = useTask({ chat, convs });
  useEffect(() => {
    runningRef.current = task.running;
  }, [task.running]);

  const [showProcess, setShowProcess] = useState(true);
  const [autoFollow, setAutoFollow] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialTheme());
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showWelcome = !convs.activeConvId && chat.messages.length === 0;

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (showWelcome) {
      scrollRef.current.scrollTop = 0;
      return;
    }
    if (autoFollow) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.messages, autoFollow, showWelcome]);

  // 图表/表格/图片异步撑高时继续贴底，避免加载完成后停在半空
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
    // 只有用户主动上翻才暂停跟随；布局/内容变高引起的滚动不关闭跟随
    if (movedUp) setAutoFollow(false);
    else if (nearBottom) setAutoFollow(true);
  };

  const scrollToBottom = () => {
    setAutoFollow(true);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const activeConversation = convs.conversations.find((c) => c.id === convs.activeConvId);
  const headerTitle = activeConversation?.title || fm('copilot.app.console');
  const antdLocale = getLocale().toLowerCase().startsWith('zh') ? zhCN : enUS;
  const themeConfig = useMemo(() => buildTheme(themeMode), [themeMode]);
  // 页面级 hook 在 ConfigProvider 之外执行，用当前主题配置显式生成 token，
  // 保证 useEmotionCss 的颜色/圆角/阴影与页面实际主题一致。
  const designToken = useMemo(() => theme.getDesignToken(themeConfig), [themeConfig]);
  const appCss = useEmotionCss(() => copilotStyles({ token: designToken }));

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
    <ConfigProvider locale={antdLocale} theme={themeConfig}>
      <XProvider locale={antdLocale} theme={themeConfig}>
        <div className={appCss}>
          <LoginGate>
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
                themeMode={themeMode}
                onToggleTheme={() =>
                  setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))
                }
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
                  {fm('copilot.msg.scroll.bottom')}
                </button>
              )}

              <div className="copilot-composer-wrap">
                <div className="copilot-composer-inner">
                  <Composer running={task.running} onSend={task.send} onStop={task.stop} />
                </div>
              </div>
            </main>
          </div>
          </LoginGate>
        </div>
      </XProvider>
    </ConfigProvider>
  );
}
