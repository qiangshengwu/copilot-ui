import {useCallback, useEffect, useRef} from 'react';
import type {MutableRefObject} from 'react';
import {Modal} from 'antd';
import {useModel, useRequest} from '@umijs/max';
import {copilotClient} from '@/services/clients';
import {XStream} from '@ant-design/x-sdk';
import type {SSEEvent} from '@/types';
import {newBlockId, newMsgId, truncateTitle, tick} from './chatUtils';
import type {ChatState} from './useChatState';
import type {ConversationsState} from './useConversations';
import {getLogin} from "@/utils/token";

interface Options {
    chat: ChatState;
    convs: ConversationsState;
}

/**
 * 任务全链路：发送 / 停止 / 审批 / 终态落库 / SSE 事件分发。
 * - 发送用 ahooks useRequest(manual) 管理 running 与发起；
 * - SSE 消费循环（XStream AsyncGenerator）留在本 hook，break/return 时自动取消底层流；
 * - AbortController 同时控制 POST /task 与 GET /stream。
 */
export function useTask({chat, convs}: Options) {
    const {initialState} = useModel('@@initialState');
    const tenantId = initialState?.tenant?.id as string;
    const taskIdRef = useRef<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const pollAbortRef = useRef<AbortController | null>(null);
    // SSE 流看门狗：浏览器经 umi dev 代理时后端断连不会让 fetch ReadableStream 结束，
    // for-await 永远等不到终态；用定时器主动探测流停滞。
    const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortByWatchdogRef = useRef(false);
    const runningRef = useRef(false);

    // ---------- 审批 ----------
    const doApprove = useCallback(
        (ok: boolean) => {
            const tid = taskIdRef.current;
            if (!tid) return;
            // fire-and-forget（即发即忘），审批结果由 SSE 事件回写
            copilotClient()
                .post('/{workspaceID}/copilot/task/approve', {
                    params: {path: {workspaceID: tenantId}},
                    body: {task_id: tid, approved: ok},
                })
                .catch(() => {
                });
        },
        [tenantId],
    );

    const handleApprove = useCallback(
        (ok: boolean) => {
            doApprove(ok);
            // 移除待审批块
            chat.updateCur((m) => ({
                ...m,
                blocks: m.blocks.map((b) =>
                    b.kind === 'approval_pending' ? {...b, kind: 'approval_result', approved: ok} : b,
                ),
                phase: undefined,
                phaseBusy: false,
            }));
        },
        [chat, doApprove],
    );

    const handleApproveAndTrust = useCallback(() => {
        Modal.confirm({
            title: '开启本对话一键批准？',
            content:
                '开启后，本对话内所有后续写操作 / 删除操作将被自动批准并立即执行，可能造成不可恢复的数据变更。是否确认开启？',
            okText: '确认开启',
            cancelText: '取消',
            okButtonProps: {danger: true},
            onOk: () => {
                chat.setAutoApprove(true);
                doApprove(true);
                chat.updateCur((m) => ({
                    ...m,
                    blocks: m.blocks.map((b) =>
                        b.kind === 'approval_pending'
                            ? {...b, kind: 'approval_result', approved: true}
                            : b,
                    ),
                    phase: undefined,
                    phaseBusy: false,
                }));
            },
        });
    }, [chat, doApprove]);

    // ---------- 终态落库 ----------
    const persistAssistant = useCallback(
        async (convId: string, asstId: string) => {
            if (!convId) return;
            await tick(); // 等待 React flush 最新 messages
            const m = chat.msgRef.current.find((x) => x.id === asstId);
            if (!m) return;
            const content = m.content || m.streamingContent || '';
            const blocks = m.blocks && m.blocks.length ? m.blocks : null;
            try {
                await copilotClient().post('/{workspaceID}/copilot/conversations/{id}/messages', {
                    params: {path: {workspaceID: tenantId, id: convId}},
                    body: {role: 'assistant', content, blocks: blocks as never},
                });
            } catch (e) {
                console.warn('[copilot] persist assistant failed:', e);
            }
            convs.refresh();
        },
        [chat, convs, tenantId],
    );

    // ---------- SSE 事件处理 ----------
    const handleEvent = useCallback(
        (ev: SSEEvent): boolean => {
            const t = ev.type;
            const d = ev.data || {};

            if (t === 'task_created') {
                taskIdRef.current = ev.task_id || null;
                return false;
            }
            if (t === 'task_started') {
                chat.updateCur((m) => ({...m, phase: '正在分析任务…', phaseBusy: true}));
                return false;
            }
            if (t === 'step') {
                const st = d.type;
                if (st === 'thinking') {
                    // 若最后一块是未完成的 thinking，则流式追加；否则新建
                    chat.setMessages((prev) => {
                        const id = chat.curMsgIdRef.current;
                        return prev.map((m) => {
                            if (m.id !== id) return m;
                            const blocks = [...m.blocks];
                            const last = blocks[blocks.length - 1];
                            if (last && last.kind === 'thinking' && !last.thinkingDone) {
                                blocks[blocks.length - 1] = {
                                    ...last,
                                    thinkingText: (last.thinkingText || '') + (d.content || ''),
                                };
                            } else {
                                blocks.push({
                                    id: newBlockId(),
                                    kind: 'thinking',
                                    thinkingText: d.content || '',
                                    thinkingDone: false,
                                });
                            }
                            return {...m, blocks};
                        });
                    });
                    chat.updateCur((m) => ({...m, phase: '正在推理…', phaseBusy: true}));
                    return false;
                }
                if (st === 'tool_call') {
                    // 收尾前一个 thinking
                    chat.updateCur((m) => ({
                        ...m,
                        blocks: m.blocks.map((b) =>
                            b.kind === 'thinking' && !b.thinkingDone ? {...b, thinkingDone: true} : b,
                        ),
                    }));
                    const blockId = newBlockId();
                    chat.pendingToolRef.current.push({name: d.tool_name || '', blockId});
                    chat.appendBlock({
                        id: blockId,
                        kind: 'tool_call',
                        toolName: d.tool_name,
                        risk: d.risk || 'read',
                        params: d.params,
                        toolStatus: 'running',
                    });
                    chat.updateCur((m) => ({
                        ...m,
                        phase: `正在调用工具 · ${d.tool_name || ''}`,
                        phaseBusy: true,
                    }));
                    return false;
                }
                if (st === 'tool_result') {
                    const name = d.tool_name || '';
                    const content = String(d.content || '');
                    // 收尾 thinking
                    chat.updateCur((m) => ({
                        ...m,
                        blocks: m.blocks.map((b) =>
                            b.kind === 'thinking' && !b.thinkingDone ? {...b, thinkingDone: true} : b,
                        ),
                    }));
                    // 标记对应 tool_call 完成/失败
                    const failed = content.startsWith('工具执行失败');
                    const idx = chat.pendingToolRef.current.findIndex((p) => p.name === name);
                    if (idx >= 0) {
                        const pt = chat.pendingToolRef.current[idx];
                        chat.patchBlock(pt.blockId, {toolStatus: failed ? 'failed' : 'done'});
                        chat.pendingToolRef.current.splice(idx, 1);
                    }
                    // 抽图表独立块（始终可见）
                    let chartTitle: string | undefined;
                    let chartOption: Record<string, unknown> | undefined;
                    try {
                        const obj = JSON.parse(content);
                        if (obj && obj.chart && typeof obj.chart.option === 'object' && obj.chart.option) {
                            chartTitle = obj.chart.title || '数据图表';
                            chartOption = obj.chart.option;
                        }
                    } catch {
                        /* ignore */
                    }
                    if (chartOption) {
                        chat.appendBlock({id: newBlockId(), kind: 'chart', chartTitle, chartOption});
                    }
                    // 原始结果块（随过程开关隐藏）
                    chat.appendBlock({
                        id: newBlockId(),
                        kind: 'tool_result',
                        toolName: name,
                        resultContent: content,
                    });
                    chat.updateCur((m) => ({...m, phase: '正在整理结果…', phaseBusy: true}));
                    return false;
                }
                if (st === 'final') {
                    // rAF 节流合并高频 chunk，避免每 chunk 重渲染整篇 markdown
                    chat.scheduleFinal(d.content || chat.finalAnswerRef.current);
                    return false;
                }
                if (st === 'approval') {
                    chat.appendBlock({
                        id: newBlockId(),
                        kind: 'approval_result',
                        approved: !!d.approved,
                    });
                    return false;
                }
                if (st === 'a2ui') {
                    // 收尾前一个 thinking（与 tool_call 分支一致）
                    chat.updateCur((m) => ({
                        ...m,
                        blocks: m.blocks.map((b) =>
                            b.kind === 'thinking' && !b.thinkingDone ? {...b, thinkingDone: true} : b,
                        ),
                    }));
                    try {
                        const arr = JSON.parse(d.content || '');
                        if (Array.isArray(arr)) {
                            chat.appendBlock({
                                id: newBlockId(),
                                kind: 'a2ui',
                                a2uiCommands: arr,
                                a2uiRaw: d.content,
                            });
                        }
                    } catch {
                        /* 忽略：后续 final markdown 仍会到，不打断流程 */
                    }
                    return false;
                }
                return false;
            }
            if (t === 'approval') {
                if (chat.autoApprove) {
                    doApprove(true);
                    chat.appendBlock({
                        id: newBlockId(),
                        kind: 'approval_result',
                        approved: true,
                    });
                    return false;
                }
                chat.appendBlock({
                    id: newBlockId(),
                    kind: 'approval_pending',
                    toolName: d.tool,
                    params: d.params,
                });
                chat.updateCur((m) => ({...m, phase: '等待审批…', phaseBusy: true}));
                return false;
            }
            if (t === 'done') {
                chat.flushFinalSync(); // 终态前同步最后一帧
                chat.updateCur((m) => ({
                    ...m,
                    phase: undefined,
                    phaseBusy: false,
                    streaming: false,
                    content: m.streamingContent || m.content,
                    streamingContent: undefined,
                    blocks: m.blocks.map((b) =>
                        b.kind === 'thinking' ? {...b, thinkingDone: true} : b,
                    ),
                }));
                chat.finishedRef.current = true;
                return true;
            }
            if (t === 'failed') {
                chat.appendBlock({
                    id: newBlockId(),
                    kind: 'error',
                    errorText: ev.error || (d.error as string) || '未知错误',
                });
                chat.updateCur((m) => ({...m, phase: undefined, phaseBusy: false, streaming: false}));
                chat.finishedRef.current = true;
                return true;
            }
            if (t === 'cancelled') {
                chat.updateCur((m) => ({...m, phase: undefined, phaseBusy: false, streaming: false}));
                chat.finishedRef.current = true;
                return true;
            }
            return false;
        },
        [chat, doApprove],
    );

    // ---------- 完成收尾 ----------
    const finish = useCallback(() => {
        chat.cancelFinalRaf();
        taskIdRef.current = null;
        chat.curMsgIdRef.current = null;
        chat.pendingToolRef.current = [];
        abortRef.current = null;
        chat.finalAnswerRef.current = '';
    }, [chat]);

    // ---------- SSE 流看门狗 ----------
    // 阈值 25s：明显大于 LLM 两次事件的最大间隔（~8s，含长思考/工具调用），避免误判；
    // 又小于浏览器代理挂死时的无限等待。每收到一个事件就重置（清旧开新）。
    const WATCHDOG_MS = 25_000;
    const clearWatchdog = useCallback(() => {
        if (watchdogRef.current != null) {
            clearTimeout(watchdogRef.current);
            watchdogRef.current = null;
        }
    }, []);
    const armWatchdog = useCallback(() => {
        clearWatchdog();
        watchdogRef.current = setTimeout(() => {
            if (!chat.finishedRef.current) {
                // 流停滞：标记来源并 abort，for-await 会抛 AbortError 进入断线恢复
                abortByWatchdogRef.current = true;
                abortRef.current?.abort();
            }
        }, WATCHDOG_MS);
    }, [chat, clearWatchdog]);

    // ---------- 断线后轮询任务终态（只读 GET /task/{id}，不触发任务重跑） ----------
    // 背景：agent server 写超时会硬切 SSE 长连接，终态事件丢失。该端点纯读状态、无副作用，
    // 重复订阅 /stream 会重跑任务，因此用轮询而非重连。
    const pollTaskState = useCallback(
        async (convId: string, asstMsgId: string, taskId: string) => {
            const ac = new AbortController();
            pollAbortRef.current = ac;
            const signal = ac.signal;

            const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

            for (let i = 0; i < 15; i++) {
                if (signal.aborted) return;
                await sleep(2000);
                if (signal.aborted) return;

                let j: { state?: string; final_answer?: string; error?: string };
                try {
                    const resp = await fetch(`${tenantId}/copilot/task/${encodeURIComponent(taskId)}`,
                        {
                            headers: {Authorization: `Bearer ${getLogin()?.token}`},
                            signal
                        },
                    );
                    if (!resp.ok) continue; // 瞬态错误，下一轮再试
                    j = await resp.json();
                } catch (e) {
                    if ((e as Error).name === 'AbortError') return;
                    continue; // 网络抖动，下一轮再试
                }

                const state = j.state;
                // running / paused_approval：继续轮询（paused_approval 仍等审批，走既有 approve 端点）
                if (state === 'running' || state === 'paused_approval') continue;

                if (state === 'done') {
                    chat.flushFinalSync();
                    chat.updateCur((m) => ({
                        ...m,
                        disconnected: false,
                        streaming: false,
                        phase: undefined,
                        phaseBusy: false,
                        // 已有流式片段则沿用；否则用服务端 final_answer 补全
                        content: m.streamingContent || j.final_answer || m.content,
                        streamingContent: undefined,
                        blocks: m.blocks.map((b) =>
                            b.kind === 'thinking' ? {...b, thinkingDone: true} : b,
                        ),
                    }));
                    await persistAssistant(convId, asstMsgId);
                    break;
                }
                if (state === 'failed') {
                    chat.appendBlock({
                        id: newBlockId(),
                        kind: 'error',
                        errorText: j.error || '任务失败',
                    });
                    chat.updateCur((m) => ({...m, phase: undefined, phaseBusy: false, streaming: false}));
                    break;
                }
                // cancelled / 未知：保持现状清理
                break;
            }
            pollAbortRef.current = null;
        },
        [chat, persistAssistant, tenantId],
    );

    // 卸载时终止轮询与看门狗，避免对已卸载组件 setState
    useEffect(
        () => () => {
            pollAbortRef.current?.abort();
            if (watchdogRef.current != null) clearTimeout(watchdogRef.current);
        },
        [],
    );

    // ---------- 发送 ----------
    const doSend = useCallback(
        async (text: string) => {
            const prompt = (text || '').trim();
            if (!prompt) return;
            if (runningRef.current) return;

            let convId = convs.activeConvIdRef.current;
            // 无活动会话则先创建（title 取文本前 30 字符）
            if (!convId) {
                try {
                    const conv = await convs.createConversation(truncateTitle(prompt));
                    convId = conv.id;
                    convs.setActiveConvId(convId);
                } catch (e) {
                    Modal.error({
                        title: '创建会话失败',
                        content: `无法创建历史会话：${(e as Error).message}`,
                    });
                    return;
                }
            }
            const convIdStr = convId;

            // user 消息落库（失败不阻塞任务，但已尽力入列）
            try {
                await copilotClient().post('/{workspaceID}/copilot/conversations/{id}/messages', {
                    params: {path: {workspaceID: tenantId, id: convIdStr}},
                    body: {role: 'user', content: prompt, blocks: null},
                });
            } catch (e) {
                console.warn('[copilot] persist user message failed:', e);
            }

            const userMsg = {id: newMsgId(), role: 'user' as const, content: prompt, blocks: []};
            const asstMsg = {
                id: newMsgId(),
                role: 'assistant' as const,
                content: '',
                blocks: [],
                phase: '正在发送…',
                phaseBusy: true,
            };
            chat.appendMessages([userMsg, asstMsg]);
            chat.curMsgIdRef.current = asstMsg.id;
            chat.finishedRef.current = false;
            chat.finalAnswerRef.current = '';
            abortByWatchdogRef.current = false;

            abortRef.current = new AbortController();
            // history：当前会话已加载消息的 role/content 对，slice(-20)
            // （此时 appendMessages 尚未 flush，msgRef 仍为旧消息，与原实现一致，不含刚发的 user）
            const history = chat.msgRef.current
                .filter((m) => (m.role === 'user' || m.role === 'assistant') && !!m.content)
                .slice(-20)
                .map((m) => ({role: m.role, content: m.content}));
            const body = {prompt, history};

            try {
                // 1. 创建任务（标准 REST，copilotClient 统一鉴权 + 复用停止用 signal）
                const created = await copilotClient().post('/{workspaceID}/copilot/task', {
                    params: {path: {workspaceID: tenantId}},
                    body,
                    signal: abortRef.current.signal,
                });
                if (!created.data || created.error) {
                    chat.appendBlock({
                        id: newBlockId(),
                        kind: 'error',
                        errorText: `创建任务失败: ${(created.error as Error)?.message ?? '未知错误'}`,
                    });
                    await persistAssistant(convIdStr, asstMsg.id);
                    finish();
                    return;
                }
                const taskId = (created.data as { id: string }).id;
                taskIdRef.current = taskId;

                // 2. 订阅 SSE 流式端点（订阅后后端启动任务，事件不丢）
                const streamResp = await fetch(
                    `${tenantId}/copilot/task/${encodeURIComponent(taskId)}/stream`,
                    {
                        headers: {Authorization: `Bearer ${getLogin()?.token}`},
                        signal: abortRef.current.signal,
                    },
                );
                if (!streamResp.ok || !streamResp.body) {
                    const e = streamResp.ok ? '响应无 body' : await streamResp.text();
                    chat.appendBlock({id: newBlockId(), kind: 'error', errorText: `HTTP ${streamResp.status} ${e}`});
                    await persistAssistant(convIdStr, asstMsg.id);
                    finish();
                    return;
                }
                const stream = XStream({readableStream: streamResp.body});
                armWatchdog(); // 流开始即启动看门狗
                for await (const frame of stream) {
                    let ev: SSEEvent;
                    try {
                        ev = JSON.parse(frame.data);
                    } catch {
                        continue;
                    }
                    armWatchdog(); // 每收到一个事件就重置看门狗（避免把正常长思考误判为断流）
                    if (handleEvent(ev)) break;
                }
                clearWatchdog();
                const tid = taskIdRef.current; // finish() 会清空，先抓
                finish();
                if (chat.finishedRef.current) {
                    // 正常终态（done/failed/cancelled）：落库助手消息
                    await persistAssistant(convIdStr, asstMsg.id);
                } else {
                    // 流异常结束（非终态，生产直连后端断连的表现）：标记断线，不立即落库，
                    // 由 pollTaskState 终态分支统一落库，避免重复落库；轮询 GET /task/{id} 无副作用。
                    chat.updateCur((m) => ({
                        ...m,
                        disconnected: true,
                        phase: undefined,
                        phaseBusy: false,
                        streaming: false,
                    }));
                    if (tid) void pollTaskState(convIdStr, asstMsg.id, tid);
                }
            } catch (err) {
                const e = err as Error;
                const byWatchdog = abortByWatchdogRef.current;
                if (e.name !== 'AbortError') {
                    // 真实网络/解析错误：错误块 + 落库当前片段
                    chat.appendBlock({id: newBlockId(), kind: 'error', errorText: e.message || '请求失败'});
                    await persistAssistant(convIdStr, asstMsg.id);
                } else if (!byWatchdog) {
                    // 用户主动 stop()：不落错误块，落库当前片段（既有行为）
                    await persistAssistant(convIdStr, asstMsg.id);
                }
                // 看门狗触发的 abort：不立即落库，交给 pollTaskState 的 done 分支统一落库
                const tid2 = taskIdRef.current;
                clearWatchdog();
                finish();
                if (e.name === 'AbortError' && byWatchdog && !chat.finishedRef.current) {
                    chat.updateCur((m) => ({
                        ...m,
                        disconnected: true,
                        phase: undefined,
                        phaseBusy: false,
                        streaming: false,
                    }));
                    if (tid2) void pollTaskState(convIdStr, asstMsg.id, tid2);
                }
            }
        },
        [chat, convs, tenantId, handleEvent, persistAssistant, finish, pollTaskState, armWatchdog, clearWatchdog],
    );

    // 用 max useRequest(manual) 管理 running 与发起
    const {loading: running, run} = useRequest(doSend, {manual: true});
    useEffect(() => {
        runningRef.current = running;
    }, [running]);

    const send = useCallback((text: string) => {
        void run(text).catch(() => {
        });
    }, [run]);

    // ---------- 停止：先 DELETE 任务，再 abort 流，走 finish 清理 ----------
    const stop = useCallback(() => {
        const tid = taskIdRef.current;
        if (tid) {
            copilotClient()
                .del('/{workspaceID}/copilot/task/{id}', {
                    params: {path: {workspaceID: tenantId, id: tid}},
                })
                .catch(() => {
                });
        }
        pollAbortRef.current?.abort(); // 终止断线恢复轮询
        if (watchdogRef.current != null) clearTimeout(watchdogRef.current); // 停掉看门狗
        abortRef.current?.abort();
        finish();
    }, [finish, tenantId]);

    return {running, runningRef, send, stop, handleApprove, handleApproveAndTrust};
}

export type TaskState = {
    running: boolean;
    runningRef: MutableRefObject<boolean>;
    send: (text: string) => void;
    stop: () => void;
    handleApprove: (ok: boolean) => void;
    handleApproveAndTrust: () => void;
};
