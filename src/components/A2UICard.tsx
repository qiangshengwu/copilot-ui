import React, { useMemo } from 'react';
import { theme, Typography, Table, Statistic } from 'antd';
import { XCard } from '@ant-design/x-card';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import type { A2UICommand } from '@/types';
import ChartBlock from './ChartBlock';
import { useIntl, getLocale } from '@umijs/max';

// ============================================================
// 后端协议 -> XCard.Box v0.9 命令格式 转换层
//
// 后端冻结协议（SSE data.content 解析后的命令数组元素）：
//   {type:'createSurface', surface:{id,title}}
//   {type:'updateComponents', surfaceId, components:{nodeId:{type,props}}}
//   {type:'updateDataModel', surfaceId, path, value}
//   {type:'deleteSurface', surfaceId}
//
// @ant-design/x-card v0.9 实际期望：
//   {version:'v0.9', createSurface:{surfaceId, catalogId?}}
//   {version:'v0.9', updateComponents:{surfaceId, components:[{id,component,...props}]}}
//   {version:'v0.9', updateDataModel:{surfaceId,path,value}}
//   {version:'v0.9', deleteSurface:{surfaceId}}
// 且组件树必须有 id==='root' 的根节点（transformer 返回 componentMap.get('root')）。
// ============================================================

interface SurfacePlan {
  surfaceId: string;
  title?: string;
  cmds: any[];
}

interface SurfaceState {
  title?: string;
  cmds: any[];
  nodes: string[];
  hasExplicitRoot: boolean;
}

const ALLOWED_COMPONENTS = new Set(['Text', 'Table', 'Chart', 'Statistic', 'Column']);
const FORBIDDEN_PATH = new Set(['__proto__', 'constructor', 'prototype']);

function validPath(path: unknown): path is string {
  if (typeof path !== 'string' || !/^(\/[A-Za-z0-9_-]+)+$/.test(path)) return false;
  return !path.split('/').filter(Boolean).some((seg) => FORBIDDEN_PATH.has(seg));
}

/**
 * 后端自定义 A2UI 命令 -> XCard v0.9 命令。
 * 支持多 surface；同一 surface 的多次 updateComponents 会累积节点，
 * 自动 root 的 children 始终包含该 surface 已声明的全部节点。
 */
function transformCommands(commands: A2UICommand[]): SurfacePlan[] {
  const surfaces = new Map<string, SurfaceState>();

  const stateOf = (surfaceId: string): SurfaceState | undefined => surfaces.get(surfaceId);

  for (const cmd of commands.slice(0, 200)) {
    if (!cmd || typeof cmd !== 'object') continue;
    switch (cmd.type) {
      case 'createSurface': {
        const surfaceId = cmd.surface?.id;
        if (typeof surfaceId !== 'string' || !surfaceId) break;
        let state = surfaces.get(surfaceId);
        if (!state) {
          state = {
            title: typeof cmd.surface?.title === 'string' ? cmd.surface.title : undefined,
            cmds: [],
            nodes: [],
            hasExplicitRoot: false,
          };
          surfaces.set(surfaceId, state);
        } else if (typeof cmd.surface?.title === 'string') {
          state.title = cmd.surface.title;
        }
        state.cmds.push({version: 'v0.9', createSurface: {surfaceId}});
        break;
      }
      case 'updateComponents': {
        const state = stateOf(cmd.surfaceId);
        if (!state) break;
        const nodes = cmd.components || {};
        const entries = Object.entries(nodes)
          .filter(([nodeId]) => !!nodeId)
          .slice(0, 500);
        if (entries.length === 0) break;

        const arr: any[] = [];
        for (const [nodeId, node] of entries) {
          if (!node || typeof node !== 'object') continue;
          const rawType = (node as any).type;
          const component = typeof rawType === 'string' && ALLOWED_COMPONENTS.has(rawType) ? rawType : 'Unknown';
          const props = (node as any).props && typeof (node as any).props === 'object'
            ? (node as any).props
            : {};
          // 先展开业务 props，再写受保护的 id/component，避免 props 劫持结构
          arr.push({
            ...props,
            ...(component === 'Unknown' ? {__type: rawType} : {}),
            id: nodeId,
            component,
          });
          if (!state.nodes.includes(nodeId)) state.nodes.push(nodeId);
          if (nodeId === 'root') state.hasExplicitRoot = true;
        }
        if (arr.length === 0) break;
        if (!state.hasExplicitRoot) {
          arr.push({id: 'root', component: 'Column', children: [...state.nodes]});
        }
        state.cmds.push({
          version: 'v0.9',
          updateComponents: {surfaceId: cmd.surfaceId, components: arr},
        });
        break;
      }
      case 'updateDataModel': {
        const state = stateOf(cmd.surfaceId);
        if (!state || !validPath(cmd.path)) break;
        state.cmds.push({
          version: 'v0.9',
          updateDataModel: {surfaceId: cmd.surfaceId, path: cmd.path, value: cmd.value},
        });
        break;
      }
      case 'deleteSurface': {
        const state = stateOf(cmd.surfaceId);
        if (!state) break;
        state.cmds.push({version: 'v0.9', deleteSurface: {surfaceId: cmd.surfaceId}});
        surfaces.delete(cmd.surfaceId);
        break;
      }
      default:
        break;
    }
  }

  // 保序输出；删除的 surface 不再渲染
  return [...surfaces.entries()].map(([surfaceId, state]) => ({
    surfaceId,
    title: state.title,
    cmds: state.cmds,
  }));
}

/** 供 MessageItem 提取卡片标题（多 surface 时返回第一个） */
export function getA2UISurfaceTitle(commands?: A2UICommand[]): string | undefined {
  if (!commands) return undefined;
  for (const cmd of commands) {
    if (cmd.type === 'createSurface' && cmd.surface?.title) return cmd.surface.title;
  }
  return undefined;
}

// ============================================================
// 组件实现（注册到 XCard.Box 的 components map）
// 全部使用 antd 组件 + useToken，暗色主题天然适配
// ============================================================

const TextComponent: React.FC<{ content?: React.ReactNode }> = ({ content }) => (
  <Typography.Text style={{ fontSize: 14, lineHeight: 1.7 }}>
    {content == null ? '' : String(content)}
  </Typography.Text>
);

const TableComponent: React.FC<{
  columns?: { title: string; dataIndex: string }[];
  data?: Record<string, unknown>[];
  rowKey?: string;
}> = ({ columns, data, rowKey }) => {
  const { token } = theme.useToken();
  const intl = useIntl();
  if (!Array.isArray(columns) || !Array.isArray(data)) {
    return (
      <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
        {intl.formatMessage({ id: 'copilot.msg.a2ui.table.invalid' })}
      </span>
    );
  }
  return (
    <Table
      size="small"
      columns={columns as never}
      dataSource={data}
      rowKey={rowKey || ((record: any) => String(record?.id ?? record?.name ?? JSON.stringify(record)).slice(0, 120))}
      pagination={false}
    />
  );
};

const ChartComponent: React.FC<{ option?: Record<string, unknown>; title?: string }> = ({
  option,
}) => {
  const { token } = theme.useToken();
  const intl = useIntl();
  if (!option || typeof option !== 'object') {
    return (
      <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
        {intl.formatMessage({ id: 'copilot.msg.a2ui.chart.invalid' })}
      </span>
    );
  }
  return <ChartBlock option={option} />;
};

const StatisticComponent: React.FC<{
  title?: React.ReactNode;
  value?: number | string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}> = ({ title, value, prefix, suffix }) => (
  <Statistic title={title} value={value} prefix={prefix} suffix={suffix} />
);

/** 根容器：纵向排列子组件（x-card NodeRenderer 会把子节点作为 React children 传入） */
const ColumnComponent: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { token } = theme.useToken();
  const intl = useIntl();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children || <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>{intl.formatMessage({ id: 'copilot.msg.empty' })}</span>}</div>
  );
};

/** 未知组件类型占位（不崩溃） */
const UnknownComponent: React.FC<{ __type?: string }> = ({ __type }) => {
  const { token } = theme.useToken();
  const intl = useIntl();
  return (
    <span style={{ color: token.colorWarning, fontSize: 12 }}>
      {intl.formatMessage({ id: 'copilot.msg.a2ui.unknown.type' })}: {String(__type)}
    </span>
  );
};

// ============================================================
// 错误边界：XCard 渲染抛错时降级为一行轻量提示，不白屏
// ============================================================
interface EBState {
  hasError: boolean;
}
class A2UIErrorBoundary extends React.Component<
  { children: React.ReactNode; raw?: string },
  EBState
> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('[A2UI] render error:', err);
  }
  render() {
    if (this.state.hasError) {
      const zh = getLocale().toLowerCase().startsWith('zh');
      return (
        <div style={{ fontSize: 12, color: 'inherit', opacity: 0.6, padding: '4px 0' }}>
          {zh ? '结构化结果渲染失败' : 'Failed to render structured result'}
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// 主组件
// ============================================================
export interface A2UICardProps {
  commands?: A2UICommand[];
  a2uiRaw?: string;
}

export default function A2UICard({ commands, a2uiRaw }: A2UICardProps) {
  const { token } = theme.useToken();
  const intl = useIntl();

  // 纵向容器样式（备用，实际 ColumnComponent 用 inline token 样式）
  const boxCss = useEmotionCss(({ token }) => ({
    fontSize: 14,
    color: token.colorText,
    '& .ant-table-small': { fontSize: 13 },
  }));

  // 转换后端命令 -> x-card v0.9 命令（useMemo 避免每次渲染重复计算）
  const surfaces = useMemo<SurfacePlan[]>(() => {
    if (!commands || commands.length === 0) return [];
    try {
      return transformCommands(commands);
    } catch (e) {
      console.warn('[A2UI] transform failed:', e);
      return [];
    }
  }, [commands]);

  // 组件注册表（稳定引用，避免 Box/Card 不必要的重渲染）
  const componentMap = useMemo<Record<string, React.ComponentType<any>>>(
    () => ({
      Text: TextComponent,
      Table: TableComponent,
      Chart: ChartComponent,
      Statistic: StatisticComponent,
      Column: ColumnComponent,
      Unknown: UnknownComponent,
    }),
    [],
  );

  if (surfaces.length === 0) {
    // 无有效命令：不渲染占位（避免遮挡后续 markdown）；若有 raw 则给一行提示
    if (a2uiRaw) {
      return (
        <div style={{ fontSize: 12, color: token.colorTextTertiary }}>
          {intl.formatMessage({ id: 'copilot.msg.a2ui.empty' })}
        </div>
      );
    }
    return null;
  }

  return (
    <div className={boxCss}>
      {surfaces.map((surface) => (
        <A2UIErrorBoundary key={surface.surfaceId} raw={a2uiRaw}>
          {surfaces.length > 1 && surface.title ? (
            <div style={{fontSize: 13, fontWeight: 600, margin: '4px 0 8px'}}>{surface.title}</div>
          ) : null}
          <XCard.Box commands={surface.cmds} components={componentMap}>
            <XCard.Card id={surface.surfaceId} />
          </XCard.Box>
        </A2UIErrorBoundary>
      ))}
    </div>
  );
}
