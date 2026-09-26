import { Prompts } from '@ant-design/x';
import {
  Sparkles,
  Building2,
  ChartLine,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

interface WelcomeProps {
  onPick: (text: string) => void;
}

const CAPS = [
  { icon: <Building2 size={14} />, label: '租户/设备/告警' },
  { icon: <ChartLine size={14} />, label: '时序数据/统计/图表' },
  { icon: <ShieldCheck size={14} />, label: '管理/审批' },
  { icon: <Terminal size={14} />, label: '系统工具' },
];

const SAMPLES = [
  { key: 's1', label: '统计当前租户下的设备总数' },
  { key: 's2', label: '列出告警未恢复的设备' },
  { key: 's3', label: '绘制最近 24 小时某设备的时序趋势' },
];

export default function Welcome({ onPick }: WelcomeProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 14,
        padding: '24px 16px',
        margin: 'auto',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'linear-gradient(135deg,#34d399,#0d9488)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
        }}
      >
        <Sparkles size={32} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>你好，我是 Copilot Agent</div>
      <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 460, lineHeight: 1.7 }}>
        我可以理解你的自然语言指令，自动拆解步骤、调用平台 API 与系统工具完成任务，并实时展示推理与工具调用过程。
      </div>

      <Prompts
        title="我可以帮你"
        wrap
        items={CAPS.map((c, i) => ({ key: `c${i}`, icon: c.icon, label: c.label, disabled: true }))}
        style={{ maxWidth: 560, marginTop: 8 }}
      />

      <Prompts
        title="试试："
        wrap
        items={SAMPLES.map((s) => ({ key: s.key, label: s.label }))}
        onItemClick={(info) => {
          // antd-x Prompts 类型：onItemClick?: (info: { data: PromptProps }) => void；
          // 运行时（es/prompts/index.js）点击触发 onItemClick({ data: item })。
          // 这里做防御性取值：兼容 data.label / 顶层 label 两种形态，
          // 且仅当拿到非空字符串时才 onPick，避免把 undefined/空串发给后端触发 400。
          const label =
            (info as { data?: { label?: unknown } } | undefined)?.data?.label ??
            (info as { label?: unknown } | undefined)?.label;
          if (typeof label === 'string' && label.trim()) onPick(label);
        }}
        style={{ maxWidth: 560 }}
      />
    </div>
  );
}
