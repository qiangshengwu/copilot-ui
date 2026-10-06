import { useEffect, useMemo, useRef, useState } from 'react';
import { theme } from 'antd';
import * as echarts from 'echarts';
import { useIntl } from '@umijs/max';

interface ChartBlockProps {
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

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
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
  const intl = useIntl();
  const isDark = luminance(token.colorBgLayout) < 0.5;
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  type EChartsInst = ReturnType<typeof echarts.init>;
  const instRef = useRef<EChartsInst | null>(null);

  const mergedOption = useMemo<Record<string, unknown>>(
    () => deepMerge(buildModernTheme(token), option) as Record<string, unknown>,
    [token, isDark, option],
  );

  useEffect(() => {
    if (!ref.current) return;
    let inst: echarts.ECharts | null = null;
    try {
      inst = echarts.init(ref.current, isDark ? 'dark' : undefined);
      inst.setOption(mergedOption as echarts.EChartsOption);
      instRef.current = inst;
      setFailed(false);
    } catch {
      setFailed(true);
      if (inst) {
        try {
          inst.dispose();
        } catch {
          /* ignore */
        }
      }
      instRef.current = null;
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
  }, [mergedOption, isDark]);

  if (failed) {
    return (
      <div
        style={{
          height,
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
    );
  }

  return <div ref={ref} style={{ width: '100%', height }} />;
}
