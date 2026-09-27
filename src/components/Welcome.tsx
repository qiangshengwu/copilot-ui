import { Prompts } from '@ant-design/x';
import { Sparkles, Building2, ChartLine, ShieldCheck, Terminal } from 'lucide-react';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { theme } from 'antd';

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
  const { token } = theme.useToken();

  const heroIcon = useEmotionCss(({ token }) => ({
    width: 64,
    height: 64,
    borderRadius: token.borderRadiusLG,
    background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    boxShadow: `0 0 0 6px ${token.colorPrimaryBg}, 0 10px 30px ${token.colorPrimaryBg}`,
  }));

  // 让两个 Prompts 区块在换行时也整体居中：
  // 通过官方 classNames API 设置 items 容器 justify-content center（换行胶囊居中）
  // 与标题 textAlign center。
  const promptsList = useEmotionCss(() => ({
    display: 'flex',
    justifyContent: 'center',
  }));
  const promptsTitle = useEmotionCss(() => ({
    textAlign: 'center',
  }));

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
      <div className={heroIcon}>
        <Sparkles size={32} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: token.colorText }}>
        你好，我是 Copilot Agent
      </div>
      <div
        style={{
          fontSize: 13,
          color: token.colorTextSecondary,
          maxWidth: 460,
          lineHeight: 1.7,
        }}
      >
        我可以理解你的自然语言指令，自动拆解步骤、调用平台 API 与系统工具完成任务，并实时展示推理与工具调用过程。
      </div>

      <Prompts
        classNames={{ list: promptsList, title: promptsTitle }}
        title="我可以帮你"
        wrap
        items={CAPS.map((c, i) => ({ key: `c${i}`, icon: c.icon, label: c.label, disabled: true }))}
        style={{ maxWidth: 560, marginTop: 8 }}
      />

      <Prompts
        classNames={{ list: promptsList, title: promptsTitle }}
        title="试试："
        wrap
        items={SAMPLES.map((s) => ({ key: s.key, label: s.label }))}
        onItemClick={(info) => {
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
