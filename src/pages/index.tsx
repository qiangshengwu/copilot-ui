import {useEffect, useRef, useState} from 'react';
import {theme as antdTheme, ConfigProvider, Splitter} from 'antd';
import {XProvider} from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import {useTheme} from '@/hooks/useTheme';
import {useChatState} from '@/hooks/useChatState';
import {useConversations} from '@/hooks/useConversations';
import {useTask} from '@/hooks/useTask';
import {useEmotionCss} from '@ant-design/use-emotion-css';
import ConversationSidebar from "@/components/ConversationSidebar";
import HeaderBar from "@/components/HeaderBar";
import MessageItem from "@/components/MessageItem";
import Welcome from "@/components/Welcome";
import Composer from "@/components/Composer";

export default function HomePage() {
    // ---------- 主题 ----------
    const {dark, toggle: toggleTheme} = useTheme();

    // ---------- 聊天渲染态 ----------
    const chat = useChatState();

    // running 镜像 ref：供会话操作在任务运行中禁用（打破 useTask <-> useConversations 循环依赖）
    const runningRef = useRef(false);

    // ---------- 会话列表 / 历史（租户固定，内嵌平台） ----------
    const convs = useConversations({chat, runningRef});

    // ---------- 任务发送 / 停止 / 审批 ----------
    const task = useTask({chat, convs});
    useEffect(() => {
        runningRef.current = task.running;
    }, [task.running]);

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

    // 统一主题配置：ConfigProvider 为权威来源（XProvider 的 theme 透传不可靠），
    // 保证 useToken / useEmotionCss 都读到正确的亮/暗 token。
    const themeConfig = {
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
            // 品牌主色：靛蓝（亮/暗两套）
            colorPrimary: dark ? '#6366f1' : '#4f46e5',
            borderRadius: 8,
            // 页面布局底色：暗色用柔和深靛蓝灰（替代 antd 默认纯黑 #000），
            // 亮色用清爽浅灰蓝。聊天主面板 body 背景跟随 colorBgLayout。
            colorBgLayout: dark ? '#0f172a' : '#f5f7fb',
            // 阶段语义色：推理=紫 / 工具=琥珀 / 完成=绿 / 错误=红（随主题微调亮度）
            colorInfo: dark ? '#a78bfa' : '#7c3aed',
            colorWarning: dark ? '#fbbf24' : '#d97706',
            colorSuccess: dark ? '#34d399' : '#10a37f',
            colorError: dark ? '#f87171' : '#dc2626',
        },
    };

    return (
        <ConfigProvider locale={zhCN} theme={themeConfig}>
            {/* 全局基础样式须在 ConfigProvider 内层生成，否则 useEmotionCss 读到外层亮色 token */}
            <XProvider locale={zhCN} theme={themeConfig}>
                <PanelRoot>
                    <Splitter style={{width: '100%', height: '100%', flex: 1}}>
                        <Splitter.Panel defaultSize={240} min={180} max={380} collapsible={{showCollapsibleIcon: true}}>
                            <ConversationSidebar
                                conversations={convs.conversations}
                                activeId={convs.activeConvId || null}
                                running={task.running}
                                loading={convs.convLoading}
                                loadMore={convs.loadMore}
                                hasMore={convs.hasMore}
                                loadingMore={convs.loadingMore}
                                onNew={convs.newConversation}
                                onSelect={convs.selectConversation}
                                onDelete={convs.deleteSidebar}
                                onRename={convs.rename}
                            />
                        </Splitter.Panel>

                        <Splitter.Panel>
                            <div style={{height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0}}>
                                <HeaderBar
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

                                <div ref={scrollRef} onScroll={onScroll} style={{flex: 1, overflowY: 'auto'}}>
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
                                            <Welcome onPick={task.send}/>
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

                                <Composer running={task.running} onSend={task.send} onStop={task.stop}/>
                            </div>
                        </Splitter.Panel>
                    </Splitter>
                </PanelRoot>
            </XProvider>
        </ConfigProvider>
    );
}

/**
 * 聊天主面板根容器：在 ConfigProvider 内层用 useEmotionCss 生成背景，
 * 保证 colorBgLayout（暗色 #0f172a / 亮色 #f5f7fb）真正作用于面板（emotion 全局 body 规则不可靠）。
 */
function PanelRoot({children}: { children: React.ReactNode }) {
    const css = useEmotionCss(({token}) => ({
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: token.colorBgLayout,
        color: token.colorText,
    }));
    return <div className={css}>{children}</div>;
}