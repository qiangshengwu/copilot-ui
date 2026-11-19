import { lazy, Suspense } from 'react';
import { Skeleton } from 'antd';
import type { ChartBlockProps } from './ChartBlockImpl';

// ECharts 体积较大，按需异步加载，避免首屏把图表库打进主包。
const ChartBlockImpl = lazy(() => import('./ChartBlockImpl'));

export default function ChartBlock(props: ChartBlockProps) {
  return (
    <Suspense
      fallback={
        <div style={{ width: '100%', height: props.height ?? 288 }}>
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        </div>
      }
    >
      <ChartBlockImpl {...props} />
    </Suspense>
  );
}
