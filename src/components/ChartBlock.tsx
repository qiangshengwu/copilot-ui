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
      inst = echarts.init(ref.current);
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
          color: '#cf1322',
          fontSize: 12,
          border: '1px dashed #ffa39e',
          borderRadius: 8,
          background: 'rgba(255,0,0,0.03)',
        }}
      >
        图表渲染失败
      </div>
    );
  }

  return <div ref={ref} style={{ width: '100%', height }} />;
}
