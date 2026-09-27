import { useEffect, useRef, useState } from 'react';
import { theme } from 'antd';
import * as echarts from 'echarts';

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

/**
 * 自封装 ECharts React 组件：
 * - 自适应容器尺寸（ResizeObserver）
 * - setOption 抛错时降级为“图表渲染失败”占位
 * - 暗色适配：经 theme.useToken() 的 colorBgLayout 亮度判断（主题由 ConfigProvider algorithm 驱动）
 */
export default function ChartBlock({ option, height = 288 }: ChartBlockProps) {
  const { token } = theme.useToken();
  // antd useToken 不暴露 isDark，用布局背景亮度近似判断，用于选择 echarts 暗色主题
  const isDark = luminance(token.colorBgLayout) < 0.5;
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  type EChartsInst = ReturnType<typeof echarts.init>;
  const instRef = useRef<EChartsInst | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    let inst: echarts.ECharts | null = null;
    try {
      inst = echarts.init(ref.current, isDark ? 'dark' : undefined);
      inst.setOption(option as echarts.EChartsOption);
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
  }, [option, isDark]);

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
        图表渲染失败
      </div>
    );
  }

  return <div ref={ref} style={{ width: '100%', height }} />;
}
