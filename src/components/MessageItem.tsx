import { useMemo, useState } from 'react';
import { Bubble, ThoughtChain } from '@ant-design/x';
import { Avatar, Table, Tag, Badge, Card, theme } from 'antd';
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
  LayoutTemplate,
  Send,
} from 'lucide-react';
import type { ChatMessage, Block } from '@/types';
import { XMarkdown } from '@ant-design/x-markdown';
import JsonView from './JsonView';
import ApprovalCard from './ApprovalCard';
import ChartBlock from './ChartBlock';
import A2UICard, { getA2UISurfaceTitle } from './A2UICard';
import { useEmotionCss } from '@ant-design/use-emotion-css';

// ---------------- 工具结果解析（实体列表 -> Table；否则 JSON） ----------------
function ResultView({ content }: { content?: string }) {
  const { token } = theme.useToken();
  const parsed = useMemo(() => {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }, [content]);

  if (parsed === undefined)
    return (
      <pre
        style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 12.5,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
          background: token.colorFillQuaternary,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          padding: '8px 10px',
        }}
      >
        {content}
      </pre>
    );
  if (!parsed)
    return <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>(空)</span>;

  const items = parsed?.entities?.items;
  if (Array.isArray(items) && items.length) {
    const isOn = (v: unknown) =>
      v === 'active' || v === 'enabled' || v === 'true' || v === true;
    const columns = [
      { title: '名称', dataIndex: 'name', key: 'name' },
      {
        title: '别名',
        dataIndex: 'alias',
        key: 'alias',
        render: (v: unknown) => (v == null ? '' : String(v)),
      },
      {
        title: '外部ID',
        dataIndex: 'externalId',
        key: 'externalId',
        render: (v: unknown) => (v == null ? '' : String(v)),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (v: unknown) =>
          v === undefined || v === '' ? (
            <span style={{ color: token.colorTextTertiary }}>—</span>
          ) : (
            <Badge
              status={isOn(v) ? 'success' : 'default'}
              text={<span style={{ fontSize: 12 }}>{String(v)}</span>}
            />
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
        <Table
          size="small"
          rowKey={(_, i) => String(i)}
          dataSource={items}
          columns={columns as never}
          pagination={false}
        />
        <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
          共 {items.length} 条
        </div>
      </Card>
    );
  }
  return <JsonView value={parsed} />;
}

const RISK_COLOR: Record<string, string> = { read: 'green', modify: 'orange', danger: 'red' };

/** phase 文案 -> 语义色/图标（纯展示层映射，不影响流程逻辑） */
function phaseMeta(
  phase: string,
  token: ReturnType<typeof theme.useToken>['token'],
): { color: string; bg: string; Icon: typeof Brain } {
  if (/推理|分析|思考|回答/.test(phase))
    return { color: token.colorInfo, bg: token.colorInfoBg, Icon: Brain };
  if (/工具|调用/.test(phase))
    return { color: token.colorWarning, bg: token.colorWarningBg, Icon: Wrench };
  if (/审批|等待/.test(phase))
    return { color: token.colorError, bg: token.colorErrorBg, Icon: AlertTriangle };
  if (/整理|结果|完成/.test(phase))
    return { color: token.colorSuccess, bg: token.colorSuccessBg, Icon: CheckCircle2 };
  return { color: token.colorTextSecondary, bg: token.colorFillTertiary, Icon: Send };
}

interface MessageItemProps {
  msg: ChatMessage;
  showProcess: boolean;
  onApprove: (ok: boolean) => void;
  onApproveAndTrust: () => void;
}

export default function MessageItem({ msg, showProcess, onApprove, onApproveAndTrust }: MessageItemProps) {
  const { token } = theme.useToken();

  // Markdown 渲染 / JSON 高亮 / 打字机光标 / 阶段动画样式 —— 由本组件 useEmotionCss 提供，
  // 通过全局选择器作用于 dangerouslySetInnerHTML 注入的 .md-body / .json-hl HTML。
  useEmotionCss(({ token }) => ({
    '.md-body': {
      lineHeight: 1.75,
      wordBreak: 'break-word',
      fontSize: 14,
      color: token.colorText,
    },
    '.md-body h1, .md-body h2, .md-body h3, .md-body h4': { fontWeight: 600, margin: '0.8em 0 0.3em' },
    '.md-body h1': { fontSize: '1.3rem' },
    '.md-body h2': { fontSize: '1.15rem' },
    '.md-body h3': { fontSize: '1.05rem' },
    '.md-body p': { margin: '0.45em 0' },
    '.md-body ul, .md-body ol': { margin: '0.4em 0', paddingLeft: '1.4em' },
    '.md-body li': { margin: '0.15em 0' },
    '.md-body a': { color: token.colorPrimary, textDecoration: 'underline' },
    '.md-body code': {
      background: token.colorFillSecondary,
      padding: '1px 5px',
      borderRadius: 5,
      fontSize: '0.9em',
      fontFamily: 'ui-monospace, Consolas, monospace',
    },
    '.md-body pre': {
      background: token.colorFillQuaternary,
      padding: 10,
      borderRadius: token.borderRadiusLG,
      overflow: 'auto',
      fontSize: '12.5px',
      fontFamily: 'ui-monospace, Consolas, monospace',
    },
    '.md-body blockquote': {
      color: token.colorTextSecondary,
      borderLeft: `3px solid ${token.colorBorder}`,
      margin: '0.5em 0',
      padding: '0.1em 1em',
    },
    '.md-body table': {
      borderCollapse: 'separate',
      borderSpacing: 0,
      width: '100%',
      fontSize: 13,
      margin: '0.5em 0',
      border: `1px solid ${token.colorBorderSecondary}`,
      borderRadius: token.borderRadiusLG,
      overflow: 'hidden',
    },
    '.md-body table th, .md-body table td': {
      padding: '7px 11px',
      textAlign: 'left',
      verticalAlign: 'top',
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
    },
    '.md-body table thead th': { background: token.colorFillSecondary, fontWeight: 600, fontSize: 12 },
    '.md-body table tbody tr:nth-child(even)': { background: token.colorFillQuaternary },
    // 打字机光标
    '.type-cursor': {
      display: 'inline-block',
      width: 2,
      height: '1.1em',
      background: token.colorPrimary,
      verticalAlign: 'text-bottom',
      marginLeft: 1,
      animation: 'copilotBlink 0.8s steps(2) infinite',
    },
    '@keyframes copilotBlink': {
      '0%, 100%': { opacity: 0.2 },
      '50%': { opacity: 1 },
    },
    '@keyframes copilotSpinPulse': {
      '0%, 100%': { opacity: 0.3, transform: 'scale(0.75)' },
      '50%': { opacity: 1, transform: 'scale(1.1)' },
    },
  }));

  // 实体/图表/错误等始终可见卡片：hover 轻抬升（替代全局 .copilot-card）
  const cardClass = useEmotionCss(({ token }) => ({
    border: `1px solid ${token.colorPrimaryBorder}`,
    borderRadius: token.borderRadiusLG,
    marginBottom: 10,
    padding: 12,
    background: token.colorFillQuaternary,
    boxShadow: token.boxShadowTertiary,
    transition: 'box-shadow 150ms ease, transform 150ms ease',
    '&:hover': { boxShadow: token.boxShadowSecondary, transform: 'translateY(-1px)' },
  }));

  const spinDot = useEmotionCss(({ token }) => ({
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'currentColor',
    animation: 'copilotSpinPulse 1s ease-in-out infinite',
  }));

  const cardTitle = useEmotionCss(({ token }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: token.colorPrimary,
  }));

  const errorBox = useEmotionCss(({ token }) => ({
    marginBottom: 8,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    color: token.colorError,
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorErrorBorder}`,
    background: token.colorErrorBg,
  }));

  // 过程折叠：用户点击控制展开；流式期间自动展开当前最后一步
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // ---------- 用户消息 ----------
  if (msg.role === 'user') {
    return (
      <Bubble
        placement="end"
        content={msg.content}
        avatar={<Avatar size={28} icon={<User size={16} />} style={{ background: token.colorFill }} />}
        variant="filled"
      />
    );
  }

  const botAvatar = (
    <Avatar size={28} icon={<Bot size={16} />} style={{ background: token.colorPrimary }} />
  );

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
          status: (b.thinkingDone ? 'success' : 'loading') as 'success' | 'loading',
          content: (
            <div style={{ whiteSpace: 'pre-wrap', color: token.colorInfo, fontSize: 13 }}>
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
              {b.risk && (
                <Tag color={RISK_COLOR[b.risk] || 'default'} style={{ marginLeft: 6 }}>
                  {b.risk}
                </Tag>
              )}
            </span>
          ),
          status: (b.toolStatus === 'failed' ? 'error' : b.toolStatus === 'done' ? 'success' : 'loading') as
            | 'success'
            | 'loading'
            | 'error',
          content: <JsonView value={b.params} />,
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

  // 始终可见的块（chart / approval_pending / error / a2ui）
  const alwaysBlocks = msg.blocks.filter(
    (b) => b.kind === 'chart' || b.kind === 'approval_pending' || b.kind === 'error' || b.kind === 'a2ui',
  );
  // 实体类工具结果：始终可见的精美表格卡片（设备/实体列表等）
  const entityBlocks = msg.blocks.filter((b) => isEntityResult(b));

  const answerText = msg.streaming ? msg.streamingContent || '' : msg.content || '';

  const phase = msg.phase ? phaseMeta(msg.phase, token) : null;

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
                borderRadius: 999,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: phase.bg,
                fontSize: 12,
                fontWeight: 500,
                color: phase.color,
              }}
            >
              <phase.Icon size={12} />
              {msg.phaseBusy && <span className={spinDot} />}
              {msg.phase}
            </div>
          )}

          {/* 过程：ThoughtChain（随开关隐藏；默认折叠，流式时展开当前步） */}
          {showProcess && chainItems.length > 0 && (
            <ThoughtChain
              items={chainItems}
              expandedKeys={msg.streaming
                ? Array.from(new Set([...openKeys, chainItems[chainItems.length - 1].key]))
                : openKeys}
              onExpand={setOpenKeys}
              style={{ marginBottom: 12 }}
            />
          )}

          {/* 实体类工具结果：始终可见的精美表格卡片（设备/实体列表等） */}
          {entityBlocks.map((b) => (
            <div key={b.id} className={cardClass}>
              <div className={cardTitle}>
                <Table2 size={15} color={token.colorPrimary} />
                {b.toolName || '实体列表'}
              </div>
              <ResultView content={b.resultContent} />
            </div>
          ))}

          {/* 始终可见块：图表 / 待审批 / 错误 / A2UI 结构化卡片 */}
          {alwaysBlocks.map((b) => {
            if (b.kind === 'chart') {
              return (
                <div key={b.id} className={cardClass}>
                  <div className={cardTitle}>
                    <ChartLine size={15} color={token.colorPrimary} />
                    {b.chartTitle || '数据图表'}
                  </div>
                  {b.chartFailed || !b.chartOption ? (
                    <div style={{ color: token.colorError, fontSize: 12 }}>图表渲染失败</div>
                  ) : (
                    <ChartBlock option={b.chartOption} />
                  )}
                </div>
              );
            }
            if (b.kind === 'a2ui') {
              return (
                <div key={b.id} className={cardClass}>
                  <div className={cardTitle}>
                    <LayoutTemplate size={15} color={token.colorPrimary} />
                    {getA2UISurfaceTitle(b.a2uiCommands) || '结构化结果'}
                  </div>
                  <A2UICard commands={b.a2uiCommands} a2uiRaw={b.a2uiRaw} />
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
              <div key={b.id} className={errorBox}>
                <AlertTriangle size={14} style={{ marginTop: 2 }} />
                {b.errorText || '未知错误'}
              </div>
            );
          })}

          {/* 助手回答 Markdown */}
          {(msg.streaming || msg.content) && (
            <XMarkdown
              className="md-body"
              content={answerText}
              openLinksInNewTab
              streaming={msg.streaming ? { hasNextChunk: true, tail: true } : undefined}
            />
          )}

          {/* 连接中断提示 */}
          {msg.disconnected && (
            <div
              className={errorBox}
              style={{
                marginTop: 8,
                fontWeight: 500,
                background: token.colorErrorBg,
                border: `1px solid ${token.colorErrorBorder}`,
                color: token.colorError,
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
