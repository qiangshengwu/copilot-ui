import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface ChartBlockProps {
  option: Record<string, unknown>;
  height?: number;
}

/**
 * 自封装 ECharts React 组件：
 * - 自适应容器尺寸（ResizeObserver）
 * - setOption 抛错时降级为“图表渲染失败”占位
 */
export default function ChartBlock({ option, height = 288 }: ChartBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  type EChartsInst = ReturnType<typeof echarts.init>;
  const instRef = useRef<EChartsInst | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    let inst: echarts.ECharts | null = null;
    try {
      // 暗色适配：<html> 上的 .dark class 与 antd darkAlgorithm 同步，暗色下用 echarts 'dark' 主题
      const dark = document.documentElement.classList.contains('dark');
      inst = echarts.init(ref.current, dark ? 'dark' : undefined);
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
  }, [option]);

  if (failed) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          fontSize: 12,
          border: '1px dashed var(--md-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--error-bg)',
        }}
      >
        图表渲染失败
      </div>
    );
  }

  return <div ref={ref} style={{ width: '100%', height }} />;
}
