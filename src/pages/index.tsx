import {useEffect, useRef, useState} from 'react';
import {ConfigProvider, Splitter} from 'antd';
import {XProvider} from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import {useChatState} from '@/hooks/useChatState';
import {useConversations} from '@/hooks/useConversations';
import {useTask} from '@/hooks/useTask';
import {useEmotionCss} from '@ant-design/use-emotion-css';
import ConversationSidebar from "@/components/ConversationSidebar";
import HeaderBar from "@/components/HeaderBar";
import MessageItem from "@/components/MessageItem";
import Welcome from "@/components/Welcome";
import Composer from "@/components/Composer";
import BasePage from "@/components/BasePage";

export default function HomePage() {
    const chat = useChatState();

    const runningRef = useRef(false);

    const convs = useConversations({chat, runningRef});

    const task = useTask({chat, convs});
    useEffect(() => {
        runningRef.current = task.running;
    }, [task.running]);

    const [showProcess, setShowProcess] = useState(true);
    const [autoFollow, setAutoFollow] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

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

    const showWelcome = !convs.activeConvId && chat.messages.length === 0;

    // 只提供中文 locale，不再定制主题 token：组件统一 useToken 取宿主/框架 token，
    // 深浅主题由框架层面统一调整（内嵌平台时跟随宿主）。
    return (
        <ConfigProvider locale={zhCN}>
            <XProvider locale={zhCN}>
                <BasePage breadcrumb={false}>
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
                        <div
                            style={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0,
                                // 输入框 absolute 悬浮相对本栏定位
                                position: 'relative',
                            }}
                        >
                            <HeaderBar
                                showProcess={showProcess}
                                onShowProcessChange={setShowProcess}
                                autoFollow={autoFollow}
                                onToggleFollow={() => {
                                    setAutoFollow(true);
                                    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                                }}
                                onClear={convs.deleteCurrent}
                                autoApprove={chat.autoApprove}
                                onDisableAutoApprove={() => chat.setAutoApprove(false)}
                            />

                            <div
                                ref={scrollRef}
                                onScroll={onScroll}
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    // 顶部留白：HeaderBar absolute 悬浮于顶部，首条消息不被遮挡
                                    paddingTop: 48,
                                    // 底部留白：输入框悬浮（absolute）在其上，滚动条可滚到真正底部，
                                    // 最后一条消息/完整底部内容不被输入框遮挡。
                                    paddingBottom: 120,
                                }}
                            >
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
                </BasePage>
            </XProvider>
        </ConfigProvider>
    );
}