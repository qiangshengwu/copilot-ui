import { memo, useEffect, useMemo, useState } from 'react';
import { ThoughtChain } from '@ant-design/x';
import { Avatar, Table, Tag, Badge, Card, theme } from 'antd';
import {
  User,
  Bot,
  Brain,
  Wrench,
  Package,
  Check,
  CheckCircle2,
  Copy,
  XCircle,
  AlertTriangle,
  ChartLine,
  Table2,
  LayoutTemplate,
  Send,
  Activity,
} from 'lucide-react';
import type { ChatMessage, Block, A2UICommand } from '@/types';
import { XMarkdown } from '@ant-design/x-markdown';
import JsonView from './JsonView';
import ApprovalCard from './ApprovalCard';
import ChartBlock from './ChartBlock';
import A2UICard, { getA2UISurfaceTitle } from './A2UICard';
import DataResultView, { canRenderDataResult } from './DataResultView';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { useIntl } from '@umijs/max';

const MD_SANITIZE = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'iframe', 'svg', 'math'],
  FORBID_ATTR: ['style'],
} as const;

// ---------------- 工具结果解析（实体列表 -> Table；否则 JSON） ----------------
function ResultView({ content }: { content?: string }) {
  const { token } = theme.useToken();
  const intl = useIntl();
  const fm = (id: string) => intl.formatMessage({ id });
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
    return <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>{fm('copilot.msg.empty')}</span>;

  const items = parsed?.entities?.items;
  if (Array.isArray(items) && items.length) {
    const isOn = (v: unknown) =>
      v === 'active' || v === 'enabled' || v === 'true' || v === true;
    const columns = [
      { title: fm('copilot.msg.table.name'), dataIndex: 'name', key: 'name' },
      {
        title: fm('copilot.msg.table.alias'),
        dataIndex: 'alias',
        key: 'alias',
        render: (v: unknown) => (v == null ? '' : String(v)),
      },
      {
        title: fm('copilot.msg.table.external.id'),
        dataIndex: 'externalId',
        key: 'externalId',
        render: (v: unknown) => (v == null ? '' : String(v)),
      },
      {
        title: fm('copilot.msg.table.status'),
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
        title: fm('copilot.msg.table.attr'),
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
          rowKey={(record: any) => String(record?.id ?? record?.externalId ?? record?.name ?? '')}
          dataSource={items}
          columns={columns as never}
          pagination={false}
        />
        <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
          {intl.formatMessage({ id: 'copilot.msg.total.count' }, { n: items.length })}
        </div>
      </Card>
    );
  }
  // 专用渲染（时序/波形工具结果 → 表格/统计/曲线），无法识别时回退 JsonView。
  // 注意：必须作为组件渲染（DataResultView 内部使用 hooks），不能当普通函数调用。
  if (canRenderDataResult(parsed)) return <DataResultView value={parsed} />;
  return <JsonView value={parsed} />;
}

// ---------------- 最终回答美化：把 A2UI 命令 JSON 码块渲染成结构化卡片 ----------------
// ```json\n[{type:"createSurface"...},...] ``` 这类码块若为后端 A2UI 命令，从 markdown 中摘出，
// 用 A2UICard 渲染成结构化卡片（Statistic/Table/Chart 等），避免最终回答仍是大段纯文字 JSON。
function splitA2UIJsonBlocks(md: string): { text: string; cards: A2UICommand[][] } {
  const cards: A2UICommand[][] = [];
  // parts 交替为 [文本, json, 文本, json, ...]
  const parts = md.split(/```json[ \t]*\r?\n([\s\S]*?)```/g);
  for (let i = 1; i < parts.length; i += 2) {
    const raw = parts[i].trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every(
          (c) =>
            c &&
            typeof c.type === 'string' &&
            /^(createSurface|updateComponents|updateDataModel|deleteSurface)$/.test(c.type),
        )
      ) {
        cards.push(parsed as A2UICommand[]);
        parts[i] = ''; // 从最终回答文本中移除，改由卡片渲染
      }
    } catch {
      /* 非法 JSON：保留原文码块 */
    }
  }
  return { text: parts.join(''), cards };
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

function MessageItem({ msg, showProcess, onApprove, onApproveAndTrust }: MessageItemProps) {
  const { token } = theme.useToken();
  const intl = useIntl();
  const fm = (id: string) => intl.formatMessage({ id });

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

  // 流式结束后默认收起过程，避免大段 JSON 长期占据首屏
  useEffect(() => {
    if (!msg.streaming) setOpenKeys([]);
  }, [msg.streaming]);

  // 复制回答（放在早期 return 之前，保证 hooks 顺序稳定）
  const [copied, setCopied] = useState(false);
  const copyAnswer = async () => {
    const text = msg.content || msg.streamingContent || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard 不可用时静默 */
    }
  };

  // ---------- 用户消息 ----------
  if (msg.role === 'user') {
    return (
      <div className="cp-msg cp-msg-user cp-fade-up">
        <div className="cp-msg-user-bubble">{msg.content}</div>
        <Avatar
          size={30}
          className="cp-msg-avatar"
          icon={<User size={15} />}
          style={{ background: token.colorFill, color: token.colorTextSecondary }}
        />
      </div>
    );
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
  // 设备数据结果（read_device_data / read_waveform / fft_spectrum）：提升为始终可见卡片
  // （表格/趋势图/波形曲线/频谱图），不进折叠的"推理过程"，避免最终结果区仍是纯文字。
  const isDataResult = (b: Block) => {
    if (b.kind !== 'tool_result' || !b.resultContent) return false;
    try {
      const p = JSON.parse(b.resultContent);
      return (
        (Array.isArray(p?.messages) && p.messages.length > 0) ||
        (p?.decoded === true && Array.isArray(p?.channels) && p.channels.length > 0) ||
        (p?.fft && Array.isArray(p.fft.freq) && Array.isArray(p.fft.magnitude))
      );
    } catch {
      return false;
    }
  };
  const chainItems = msg.blocks
    .filter(
      (b) =>
        ['thinking', 'tool_call', 'tool_result', 'approval_result'].includes(b.kind) &&
        !(b.kind === 'tool_result' && (isEntityResult(b) || isDataResult(b))),
    )
    .map((b: Block) => {
      if (b.kind === 'thinking') {
        return {
          key: b.id,
          icon: <Brain size={14} />,
          title: fm('copilot.msg.thinking'),
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
              {intl.formatMessage({ id: 'copilot.msg.tool.call' }, { name: b.toolName })}
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
          title: intl.formatMessage({ id: 'copilot.msg.tool.result' }, { name: b.toolName || '' }),
          status: 'success' as const,
          content: <ResultView content={b.resultContent} />,
        };
      }
      // approval_result
      return {
        key: b.id,
        icon: b.approved ? <CheckCircle2 size={14} /> : <XCircle size={14} />,
        title: b.approved ? fm('copilot.msg.approved') : fm('copilot.msg.rejected'),
        status: (b.approved ? 'success' : 'error') as 'success' | 'error',
      };
    })
    // 默认折叠：只展示步骤标题，展开后才显示 JSON/长文本
    .map((item) => ({...item, collapsible: true}));

  // 始终可见的块（chart / approval_pending / error / a2ui）
  const alwaysBlocks = msg.blocks.filter(
    (b) => b.kind === 'chart' || b.kind === 'approval_pending' || b.kind === 'error' || b.kind === 'a2ui',
  );
  // 实体类工具结果：始终可见的精美表格卡片（设备/实体列表等）
  const entityBlocks = msg.blocks.filter((b) => isEntityResult(b));
  // 设备数据结果（时序/波形）：始终可见卡片（表格 / 趋势图 / 波形曲线）
  const dataBlocks = msg.blocks.filter((b) => isDataResult(b));

  const answerText = msg.streaming ? msg.streamingContent || '' : msg.content || '';
  // 摘出最终回答里的 A2UI 命令 JSON 码块，渲染为结构化卡片，避免纯文本 JSON
  const { text: cleanAnswer, cards: a2uiCards } = useMemo(() => splitA2UIJsonBlocks(answerText), [answerText]);

  const phase = msg.phase ? phaseMeta(msg.phase, token) : null;

  return (
    <article className="cp-msg cp-msg-assistant cp-fade-up">
      <Avatar
        size={30}
        className="cp-msg-avatar"
        icon={<Bot size={15} />}
        style={{ background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})` }}
      />
      <div className="cp-msg-body">
        <div className="cp-msg-head">
          <span className="cp-msg-name">Copilot</span>
          {phase && (
            <span className="cp-phase" style={{ color: phase.color, background: phase.bg }}>
              <phase.Icon size={11} />
              {msg.phaseBusy && <span className="cp-spin" />}
              {msg.phase}
            </span>
          )}
        </div>

          {/* 过程：ThoughtChain（随开关隐藏；默认折叠，流式时展开当前步） */}
          {showProcess && chainItems.length > 0 && (
            <div className="cp-process">
              <ThoughtChain
                items={chainItems}
                expandedKeys={
                  msg.streaming
                    ? Array.from(new Set([...openKeys, chainItems[chainItems.length - 1].key]))
                    : openKeys
                }
                onExpand={setOpenKeys}
              />
            </div>
          )}

          {/* 实体类工具结果：始终可见的精美表格卡片（设备/实体列表等） */}
          {entityBlocks.map((b) => (
            <div key={b.id} className="cp-result-card">
              <div className="cp-result-head">
                <Table2 size={15} color={token.colorPrimary} />
                {b.toolName || fm('copilot.msg.entity.list')}
              </div>
              <ResultView content={b.resultContent} />
            </div>
          ))}

          {/* 设备数据结果（时序/波形）：始终可见卡片（统计 / 趋势图 / 波形曲线），
              不只在折叠的"推理过程"里显示 */}
          {dataBlocks.map((b) => {
            let parsed: unknown = null;
            try {
              parsed = JSON.parse(b.resultContent || '');
            } catch {
              /* ignore */
            }
            return (
              <div key={b.id} className="cp-result-card">
                <div className="cp-result-head">
                  <Activity size={15} color={token.colorPrimary} />
                  {b.toolName || '设备数据结果'}
                </div>
                {parsed ? <DataResultView value={parsed} /> : <ResultView content={b.resultContent} />}
              </div>
            );
          })}

          {/* 始终可见块：图表 / 待审批 / 错误 / A2UI 结构化卡片 */}
          {alwaysBlocks.map((b) => {
            if (b.kind === 'chart') {
              return (
                <div key={b.id} className="cp-result-card">
                  <div className="cp-result-head">
                    <ChartLine size={15} color={token.colorPrimary} />
                    {b.chartTitle || fm('copilot.msg.chart')}
                  </div>
                  {b.chartFailed || !b.chartOption ? (
                    <div style={{ color: token.colorError, fontSize: 12 }}>{fm('copilot.msg.chart.failed')}</div>
                  ) : (
                    <ChartBlock option={b.chartOption} />
                  )}
                </div>
              );
            }
            if (b.kind === 'a2ui') {
              return (
                <div key={b.id} className="cp-result-card">
                  <div className="cp-result-head">
                    <LayoutTemplate size={15} color={token.colorPrimary} />
                    {getA2UISurfaceTitle(b.a2uiCommands) || fm('copilot.msg.structured')}
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
                  risk={b.risk}
                  params={b.params}
                  submitting={b.approvalSubmitting}
                  onApprove={onApprove}
                  onApproveAndTrust={onApproveAndTrust}
                />
              );
            }
            // error
            return (
              <div key={b.id} className="cp-error">
                <AlertTriangle size={14} style={{ marginTop: 2 }} />
                {b.errorText || fm('copilot.msg.unknown.error')}
              </div>
            );
          })}

          {/* 助手回答 Markdown */}
          {(msg.streaming || msg.content) && (
            <XMarkdown
              className="md-body"
              content={cleanAnswer}
              openLinksInNewTab
              escapeRawHtml
              dompurifyConfig={MD_SANITIZE as any}
              streaming={msg.streaming ? { hasNextChunk: true, tail: true, incremental: true } : undefined}
            />
          )}

          {/* 最终回答中的 A2UI 结构化卡片（原 JSON 码块不再以纯文本展示） */}
          {a2uiCards.map((cmds, i) => (
            <div key={`a2ui-md-${i}`} style={{ marginTop: 8 }}>
              <A2UICard commands={cmds} />
            </div>
          ))}

          {/* 连接中断提示 */}
          {msg.disconnected && (
            <div
              className="cp-error"
              style={{
                marginTop: 8,
                fontWeight: 500,
                background: token.colorErrorBg,
                border: `1px solid ${token.colorErrorBorder}`,
                color: token.colorError,
              }}
            >
              <AlertTriangle size={14} />
              {fm('copilot.msg.disconnected')}
            </div>
          )}
        <div className="cp-msg-actions">
          <button type="button" className="cp-action-btn" onClick={copyAnswer} disabled={!answerText}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? fm('copilot.msg.copied') : fm('copilot.msg.copy')}
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(
  MessageItem,
  (prev, next) => prev.msg === next.msg && prev.showProcess === next.showProcess,
);
