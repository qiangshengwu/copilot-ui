import { useMemo, useState, useEffect } from 'react';
import { Bubble, ThoughtChain } from '@ant-design/x';
import { Table, Tag, Badge, Card, List, Descriptions } from 'antd';
import {
  User,
  Bot,
  Brain,
  Wrench,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChartLine,
  Table2,
  Send,
} from 'lucide-react';
import type { ChatMessage, Block } from '@/types';
import { renderMarkdown } from '@/utils/markdown';
import { highlightJson } from '@/utils/jsonHighlight';
import ApprovalCard from './ApprovalCard';
import ChartBlock from './ChartBlock';

// ---------------- 工具结果解析（实体列表 -> Table；否则 JSON） ----------------
function ResultView({ content }: { content?: string }) {
  const parsed = useMemo(() => {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }, [content]);

  if (parsed === undefined) return <pre className="json-plain">{content}</pre>;
  if (!parsed) return <span style={{ color: 'var(--md-muted)', fontSize: 12 }}>(空)</span>;

  const items = parsed?.entities?.items;
  if (Array.isArray(items) && items.length) {
    const isOn = (v: unknown) =>
      v === 'active' || v === 'enabled' || v === 'true' || v === true;
    const columns = [
      { title: '名称', dataIndex: 'name', key: 'name' },
      { title: '别名', dataIndex: 'alias', key: 'alias', render: (v: unknown) => (v == null ? '' : String(v)) },
      { title: '外部ID', dataIndex: 'externalId', key: 'externalId', render: (v: unknown) => (v == null ? '' : String(v)) },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (v: unknown) =>
          v === undefined || v === '' ? (
            <span style={{ color: '#9ca3af' }}>—</span>
          ) : (
            <Badge status={isOn(v) ? 'success' : 'default'} text={<span style={{ fontSize: 12 }}>{String(v)}</span>} />
          ),
      },
      {
        title: '属性',
        dataIndex: 'attributes',
        key: 'attributes',
        render: (v: Record<string, unknown> = {}) =>
          Object.keys(v)
            .map((k) => `${k}=${v[k]}`)
            .join(', '),
      },
    ];
    return (
      <Card
        size="small"
        variant="outlined"
        style={{ marginTop: 4, border: 'none', background: 'transparent', boxShadow: 'none' }}
      >
        <Table size="small" rowKey={(_, i) => String(i)} dataSource={items} columns={columns as never} pagination={false} />
        <div style={{ fontSize: 12, color: 'var(--md-muted)', marginTop: 4 }}>共 {items.length} 条</div>
      </Card>
    );
  }
  return <div dangerouslySetInnerHTML={{ __html: highlightJson(parsed) }} />;
}

const RISK_COLOR: Record<string, string> = { read: 'green', modify: 'orange', danger: 'red' };

const botAvatar = { icon: <Bot size={16} />, style: { background: 'linear-gradient(135deg,#34d399,#0d9488)' } };
const userAvatar = { icon: <User size={16} />, style: { background: '#52525b' } };

/** phase 文案 -> 语义色/图标（纯展示层映射，不影响流程逻辑） */
function phaseMeta(phase: string): { color: string; bg: string; Icon: typeof Brain } {
  if (/推理|分析|思考|回答/.test(phase))
    return { color: 'var(--phase-thinking)', bg: 'var(--phase-thinking-bg)', Icon: Brain };
  if (/工具|调用/.test(phase))
    return { color: 'var(--phase-tool)', bg: 'var(--phase-tool-bg)', Icon: Wrench };
  if (/审批|等待/.test(phase))
    return { color: 'var(--phase-wait)', bg: 'var(--phase-wait-bg)', Icon: AlertTriangle };
  if (/整理|结果|完成/.test(phase))
    return { color: 'var(--phase-done)', bg: 'var(--phase-done-bg)', Icon: CheckCircle2 };
  return { color: 'var(--phase-send)', bg: 'var(--phase-send-bg)', Icon: Send };
}

interface MessageItemProps {
  msg: ChatMessage;
  showProcess: boolean;
  onApprove: (ok: boolean) => void;
  onApproveAndTrust: () => void;
}

export default function MessageItem({ msg, showProcess, onApprove, onApproveAndTrust }: MessageItemProps) {
  // 过程折叠：用户点击控制展开；流式期间自动展开当前最后一步
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  // ---------- 用户消息 ----------
  if (msg.role === 'user') {
    return <Bubble placement="end" content={msg.content} avatar={userAvatar} variant="filled" />;
  }

  // ---------- 助手消息：把 blocks 转成 ThoughtChain items ----------
  // 实体类工具结果（可渲染为表格）提升为始终可见卡片，不进 ThoughtChain 折叠，避免重复。
  const isEntityResult = (b: Block) => {
    if (b.kind !== 'tool_result' || !b.resultContent) return false;
    try {
      const p = JSON.parse(b.resultContent);
      return Array.isArray(p?.entities?.items) && p.entities.items.length > 0;
    } catch {
      return false;
    }
  };
  const chainItems = msg.blocks
    .filter(
      (b) =>
        ['thinking', 'tool_call', 'tool_result', 'approval_result'].includes(b.kind) &&
        !(b.kind === 'tool_result' && isEntityResult(b)),
    )
    .map((b: Block) => {
      if (b.kind === 'thinking') {
        return {
          key: b.id,
          icon: <Brain size={14} />,
          title: '推理过程',
          status: (b.thinkingDone ? 'success' : 'pending') as 'success' | 'pending',
          content: (
            <div style={{ whiteSpace: 'pre-wrap', color: '#8b5cf6', fontSize: 13 }}>
              {b.thinkingText}
              {!b.thinkingDone && <span className="type-cursor" />}
            </div>
          ),
        };
      }
      if (b.kind === 'tool_call') {
        return {
          key: b.id,
          icon: <Wrench size={14} />,
          title: (
            <span>
              调用工具 · {b.toolName}
              {b.risk && <Tag color={RISK_COLOR[b.risk] || 'default'} style={{ marginLeft: 6 }}>{b.risk}</Tag>}
            </span>
          ),
          status: (b.toolStatus === 'failed' ? 'error' : b.toolStatus === 'done' ? 'success' : 'pending') as
            | 'success'
            | 'pending'
            | 'error',
          content: <div dangerouslySetInnerHTML={{ __html: highlightJson(b.params) }} />,
        };
      }
      if (b.kind === 'tool_result') {
        return {
          key: b.id,
          icon: <Package size={14} />,
          title: `工具结果 · ${b.toolName || ''}`,
          status: 'success' as const,
          content: <ResultView content={b.resultContent} />,
        };
      }
      // approval_result
      return {
        key: b.id,
        icon: b.approved ? <CheckCircle2 size={14} /> : <XCircle size={14} />,
        title: b.approved ? '已批准' : '已拒绝',
        status: (b.approved ? 'success' : 'error') as 'success' | 'error',
      };
    });

  // 始终可见的块（chart / approval_pending / error）
  const alwaysBlocks = msg.blocks.filter(
    (b) => b.kind === 'chart' || b.kind === 'approval_pending' || b.kind === 'error',
  );
  // 实体类工具结果：始终可见的精美表格卡片（设备/实体列表等）
  const entityBlocks = msg.blocks.filter((b) => isEntityResult(b));

  const answerHtml = msg.streaming
    ? renderMarkdown(msg.streamingContent || '')
    : renderMarkdown(msg.content || '');

  const phase = msg.phase ? phaseMeta(msg.phase) : null;

  return (
    <Bubble
      placement="start"
      avatar={botAvatar}
      variant="borderless"
      content={
        <div style={{ minWidth: 0 }}>
          {/* phase 状态徽标：带语义图标小药丸 */}
          {phase && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
                padding: '3px 11px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--md-border)',
                background: phase.bg,
                fontSize: 12,
                fontWeight: 500,
                color: phase.color,
              }}
            >
              <phase.Icon size={12} />
              {msg.phaseBusy && <span className="spin-dot" />}
              {msg.phase}
            </div>
          )}

          {/* 过程：ThoughtChain（随开关隐藏；默认折叠，流式时展开当前步） */}
          {showProcess && chainItems.length > 0 && (
            <ThoughtChain
              items={chainItems}
              collapsible={{
                expandedKeys: msg.streaming
                  ? Array.from(new Set([...openKeys, chainItems[chainItems.length - 1].key]))
                  : openKeys,
                onExpand: setOpenKeys,
              }}
              style={{ marginBottom: 12 }}
            />
          )}

          {/* 实体类工具结果：始终可见的精美表格卡片（设备/实体列表等） */}
          {entityBlocks.map((b) => (
            <div
              key={b.id}
              className="copilot-card"
              style={{
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 10,
                padding: 12,
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: 'var(--card-title)',
                }}
              >
                <Table2 size={15} color="var(--emerald)" />
                {b.toolName || '实体列表'}
              </div>
              <ResultView content={b.resultContent} />
            </div>
          ))}

          {/* 始终可见块：图表 / 待审批 / 错误 */}
          {alwaysBlocks.map((b) => {
            if (b.kind === 'chart') {
              return (
                <div
                  key={b.id}
                  className="copilot-card"
                  style={{
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 10,
                    padding: 12,
                    background: 'var(--card-bg)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--card-title)' }}>
                    <ChartLine size={15} color="var(--emerald)" />
                    {b.chartTitle || '数据图表'}
                  </div>
                  {b.chartFailed || !b.chartOption ? (
                    <div style={{ color: '#cf1322', fontSize: 12 }}>图表渲染失败</div>
                  ) : (
                    <ChartBlock option={b.chartOption} />
                  )}
                </div>
              );
            }
            if (b.kind === 'approval_pending') {
              return (
                <ApprovalCard
                  key={b.id}
                  tool={b.toolName}
                  params={b.params}
                  onApprove={onApprove}
                  onApproveAndTrust={onApproveAndTrust}
                />
              );
            }
            // error
            return (
              <div
                key={b.id}
                style={{
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  color: '#ef4444',
                  fontSize: 13,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  background: 'var(--error-bg)',
                }}
              >
                <AlertTriangle size={14} style={{ marginTop: 2 }} />
                {b.errorText || '未知错误'}
              </div>
            );
          })}

          {/* 助手回答 Markdown */}
          {(msg.streaming || msg.content) && (
            <div
              className="md-body"
              dangerouslySetInnerHTML={{
                __html: answerHtml + (msg.streaming ? '<span class="type-cursor"></span>' : ''),
              }}
            />
          )}

          {/* 连接中断提示 */}
          {msg.disconnected && (
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#ef4444',
                fontSize: 13,
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'var(--error-bg)',
              }}
            >
              <AlertTriangle size={14} />
              连接中断：未收到任务完成事件
            </div>
          )}
        </div>
      }
    />
  );
}
