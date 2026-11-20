import { useEffect, useMemo, useRef, useState } from 'react';
import { theme } from 'antd';
import * as echarts from 'echarts';
import { useCopilot } from '../context';

/**
 * ECharts option 安全化。
 *
 * 业务数据 / LLM 输出的 option 不可信：ECharts 的 tooltip HTML 模式会把
 * formatter 字符串写入 innerHTML，可能造成 XSS（面板同源持有平台 token）。
 * 这里做三件事：
 *  1. 只保留 JSON 可表达的数据，丢弃函数/原型对象；
 *  2. tooltip 强制 richText 渲染（canvas，不注入 DOM），移除 extraCssText 等 HTML 钩子；
 *  3. 限制深度/节点数/数组长度，避免超大 option 卡死渲染。
 */

const MAX_DEPTH = 12;
const MAX_NODES = 20_000;
const MAX_ARRAY = 5_000;

const DROP_KEYS = new Set([
  'extraCssText',
  'appendTo',
  'appendToBody',
  'className',
  'renderMode',
]);

interface SanitizeState {
  nodes: number;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function sanitizeValue(value: unknown, depth: number, state: SanitizeState): unknown {
  if (state.nodes++ > MAX_NODES || depth > MAX_DEPTH) return undefined;
  if (value == null) return value;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((v) => sanitizeValue(v, depth + 1, state));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (DROP_KEYS.has(k)) continue;
      // 事件回调/函数不能来自 JSON；这里只是防御性丢弃。
      if (k.startsWith('on') && typeof v === 'function') continue;
      const next = sanitizeValue(v, depth + 1, state);
      if (next !== undefined) out[k] = next;
    }
    return out;
  }
  return undefined;
}

/** 返回安全化后的 option；非对象返回 null（调用方降级为错误占位）。 */
export function sanitizeChartOption(option: unknown): Record<string, unknown> | null {
  if (!isPlainObject(option)) return null;
  const safe = sanitizeValue(option, 0, { nodes: 0 });
  if (!isPlainObject(safe)) return null;

  const tooltip = isPlainObject(safe.tooltip) ? safe.tooltip : {};
  safe.tooltip = {
    ...tooltip,
    // 关键：richText 模式用 canvas 渲染，formatter 不会写入 innerHTML
    renderMode: 'richText',
    confine: true,
  };
  return safe;
}

export interface ChartBlockProps {
  option: Record<string, unknown>;
  height?: number;
}

/** 相对亮度（0~1），用于从 token 判断当前暗色态 */
function luminance(color: string): number {
  try {
    let hex = color.replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6) return 1;
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  } catch {
    return 1;
  }
}

/** 深合并：extra（用户/后端 option）优先，base 仅作兜底；数组整体替换。 */
function deepMerge(base: unknown, extra: unknown): unknown {
  if (!isPlainObject(extra)) {
    return extra === undefined ? base : extra;
  }
  const out: Record<string, unknown> = { ...(isPlainObject(base) ? base : {}) };
  for (const k of Object.keys(extra)) {
    const bv = out[k];
    const ev = extra[k];
    if (isPlainObject(ev) && isPlainObject(bv)) {
      out[k] = deepMerge(bv, ev);
    } else if (ev !== undefined) {
      out[k] = ev;
    }
  }
  return out;
}

function buildModernTheme(token: ReturnType<typeof theme.useToken>['token']): Record<string, unknown> {
  const textColor = token.colorText;
  const subText = token.colorTextSecondary;
  const axisColor = token.colorBorderSecondary;
  const splitColor = token.colorSplit;
  const tooltipBg = token.colorBgElevated;
  const palette = ['#5B8FF9', '#61DDAA', '#65789B', '#F6BD16', '#7262FD', '#78D3F8', '#9661BC', '#F6903D'];

  return {
    color: palette,
    // 生成图表 aria-label，读屏用户至少能获得图表摘要
    aria: {enabled: true},
    textStyle: { fontFamily: token.fontFamily || 'inherit', color: textColor },
    tooltip: {
      confine: true,
      backgroundColor: tooltipBg,
      borderColor: axisColor,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: textColor, fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 14px rgba(0,0,0,.14); border-radius: 6px;',
    },
    legend: { textStyle: { color: subText, fontSize: 12 } },
    grid: { containLabel: true },
    xAxis: {
      axisLine: { lineStyle: { color: axisColor } },
      axisTick: { lineStyle: { color: axisColor } },
      axisLabel: { color: subText },
      splitLine: { show: false },
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: subText },
      splitLine: { lineStyle: { color: splitColor, type: 'dashed' } },
    },
  };
}

/**
 * 自封装 ECharts React 组件：
 * - 自适应容器尺寸（ResizeObserver）
 * - setOption 抛错时降级为“图表渲染失败”占位
 */
export default function ChartBlock({ option, height = 288 }: ChartBlockProps) {
  const { token } = theme.useToken();
  const { t } = useCopilot();
  const intl = { formatMessage: (d: { id: string }) => t(d.id) };
  const isDark = luminance(token.colorBgLayout) < 0.5;
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  type EChartsInst = ReturnType<typeof echarts.init>;
  const instRef = useRef<EChartsInst | null>(null);

  const safeOption = useMemo(() => sanitizeChartOption(option), [option]);
  const mergedOption = useMemo<Record<string, unknown>>(
    () => deepMerge(buildModernTheme(token), safeOption) as Record<string, unknown>,
    [token, isDark, safeOption],
  );

  // 初始化实例：只在挂载/暗色切换时重建，保留 zoom/legend 等交互状态
  useEffect(() => {
    if (!ref.current) return;
    let inst: echarts.ECharts | null = null;
    try {
      inst = echarts.init(ref.current, isDark ? 'dark' : undefined);
      instRef.current = inst;
    } catch {
      setFailed(true);
      return;
    }
    const ro = new ResizeObserver(() => {
      try {
        inst?.resize();
      } catch {
        /* ignore */
      }
    });
    ro.observe(ref.current);
    const t = setTimeout(() => {
      try {
        inst?.resize();
      } catch {
        /* ignore */
      }
    }, 80);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      try {
        inst?.dispose();
      } catch {
        /* ignore */
      }
      instRef.current = null;
    };
  }, [isDark]);

  // option 变化只 setOption，不 dispose，避免图表闪烁与交互状态丢失
  useEffect(() => {
    const inst = instRef.current;
    if (!inst || !safeOption) {
      setFailed(!safeOption);
      return;
    }
    try {
      inst.setOption(mergedOption as echarts.EChartsOption);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [mergedOption, safeOption]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div ref={ref} style={{ width: '100%', height }} />
      {failed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: token.colorError,
            fontSize: 12,
            border: `1px dashed ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            background: token.colorErrorBg,
          }}
        >
          {intl.formatMessage({ id: 'copilot.msg.chart.failed' })}
        </div>
      )}
    </div>
  );
}
