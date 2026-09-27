import { useEffect, useRef, useState } from 'react';
import { theme as antdTheme } from 'antd';
import { XProvider } from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import { getBase, setBase } from '@/utils/api';
import HeaderBar from '@/components/HeaderBar';
import MessageItem from '@/components/MessageItem';
import Welcome from '@/components/Welcome';
import Composer from '@/components/Composer';
import ConversationSidebar from '@/components/ConversationSidebar';
import { useTheme } from '@/hooks/useTheme';
import { useTenant } from '@/hooks/useTenant';
import { useChatState } from '@/hooks/useChatState';
import { useConversations } from '@/hooks/useConversations';
import { useTask } from '@/hooks/useTask';
import '@/global.less';

export default function HomePage() {
  // ---------- 主题 / base ----------
  const { dark, toggle: toggleTheme } = useTheme();
  const [base, setBaseState] = useState(() => getBase());
  const onBaseChange = (v: string) => {
    setBaseState(v);
    setBase(v);
  };

  // ---------- 租户 ----------
  const { tenants, tenantId, selectTenant } = useTenant();

  // ---------- 聊天渲染态 ----------
  const chat = useChatState();

  // running 镜像 ref：供会话操作在任务运行中禁用（打破 useTask <-> useConversations 循环依赖）
  const runningRef = useRef(false);

  // ---------- 会话列表 / 历史 ----------
  const convs = useConversations({ tenantId, chat, runningRef });

  // ---------- 任务发送 / 停止 / 审批 ----------
  const task = useTask({ chat, convs });
  useEffect(() => {
    runningRef.current = task.running;
  }, [task.running]);

  // 切换租户：持久化 + 重置活动会话/消息；列表由 queryKey ['conversations', tenantId] 自动刷新
  const handleTenantChange = (v: string) => {
    selectTenant(v);
    if (task.running) return;
    convs.resetOnTenant();
  };

  // ---------- 布局状态 ----------
  const [showProcess, setShowProcess] = useState(true);
  const [autoFollow, setAutoFollow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动：messages 变化或开启 follow 时贴底
  useEffect(() => {
    if (autoFollow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages, autoFollow]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoFollow(nearBottom);
  };

  // 欢迎态：无活动会话且无消息
  const showWelcome = !convs.activeConvId && chat.messages.length === 0;

  return (
    <XProvider
      locale={zhCN}
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: { colorPrimary: '#10a37f', borderRadius: 8 },
      }}
    >
      <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
        <ConversationSidebar
          conversations={convs.conversations}
          activeId={convs.activeConvId || null}
          running={task.running}
          dark={dark}
          loading={convs.convLoading}
          onNew={convs.newConversation}
          onSelect={convs.selectConversation}
          onDelete={convs.deleteSidebar}
          onRename={convs.rename}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <HeaderBar
            tenants={tenants}
            tenantId={tenantId}
            onTenantChange={handleTenantChange}
            base={base}
            onBaseChange={onBaseChange}
            showProcess={showProcess}
            onShowProcessChange={setShowProcess}
            autoFollow={autoFollow}
            onToggleFollow={() => {
              setAutoFollow(true);
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }}
            onClear={convs.deleteCurrent}
            dark={dark}
            onToggleTheme={toggleTheme}
            autoApprove={chat.autoApprove}
            onDisableAutoApprove={() => chat.setAutoApprove(false)}
          />

          <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto' }}>
            <div
              style={{
                maxWidth: 900,
                margin: '0 auto',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                minHeight: '100%',
              }}
            >
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

          <Composer running={task.running} onSend={task.send} onStop={task.stop} />
        </div>
      </div>
    </XProvider>
  );
}
